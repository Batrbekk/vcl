# VPS Deploy + Beeline SIP Telephony Plan

**Goal:** Deploy VOXI on VPS (195.210.47.19) with Jambonz SIP gateway connected to Beeline trunk for real phone calls using our AI pipeline (Deepgram STT → Groq LLM → Fish Audio TTS)

**Architecture:** Docker Compose on VPS runs 4 services: Jambonz (SIP↔WebSocket bridge), voxi-pipeline (Node.js audio processing), PostgreSQL, Next.js frontend. Jambonz registers SIP trunk to Beeline (46.227.186.229:5060), receives/makes calls, streams audio via WebSocket to our pipeline which processes speech in real-time.

**Tech Stack:** Docker Compose, Jambonz, Node.js, WebSocket, Deepgram SDK, Groq API, Fish Audio API, PostgreSQL, Nginx, Let's Encrypt

---

## Phase 1: VPS Setup (30 мин)

### Task 1: Подготовка VPS

**SSH:** `ssh root@195.210.47.19`

**Step 1:** Обновить систему
```bash
apt update && apt upgrade -y
```

**Step 2:** Установить Docker + Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

**Step 3:** Установить Nginx
```bash
apt install -y nginx certbot python3-certbot-nginx
```

**Step 4:** Открыть порты для SIP + RTP
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5060/udp    # SIP signalling
ufw allow 5060/tcp    # SIP signalling
ufw allow 5061/udp    # SIP signalling
ufw allow 20000:60000/udp  # RTP media
ufw allow 3000/tcp    # Next.js (temporary)
ufw enable
```

**Step 5:** Создать директорию проекта
```bash
mkdir -p /opt/voxi && cd /opt/voxi
```

---

## Phase 2: Voice Pipeline Server (1 час)

### Task 2: Node.js WebSocket Audio Server

**Create:** `/opt/voxi/pipeline/package.json`
```json
{
  "name": "voxi-pipeline",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "ws": "^8.16.0",
    "groq-sdk": "^0.8.0"
  }
}
```

**Create:** `/opt/voxi/pipeline/server.js`

Этот сервер:
1. Принимает WebSocket соединение от Jambonz (G.711 a-law PCM аудио)
2. Стримит аудио в Deepgram для STT (real-time)
3. Когда Deepgram возвращает final transcript → отправляет в Groq LLM
4. Ответ LLM → Fish Audio TTS → аудио обратно через WebSocket

```javascript
import { WebSocketServer, WebSocket } from 'ws';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const FISH_API_KEY = process.env.FISH_AUDIO_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const PORT = process.env.PIPELINE_PORT || 8080;

const wss = new WebSocketServer({ port: PORT });
console.log(`Pipeline server listening on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws) => {
  console.log('New call connected');

  let conversationHistory = [];
  let systemPrompt = process.env.BOT_PROMPT || 'Ты AI-ассистент. Говори на русском.';
  let deepgramWs = null;

  // Connect to Deepgram for real-time STT
  function connectDeepgram() {
    deepgramWs = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=nova-2&language=ru&encoding=mulaw&sample_rate=8000&channels=1&punctuate=true&endpointing=300',
      { headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}` } }
    );

    deepgramWs.on('message', async (data) => {
      const result = JSON.parse(data);
      const transcript = result.channel?.alternatives?.[0]?.transcript;
      if (transcript && result.is_final) {
        console.log('User said:', transcript);
        conversationHistory.push({ role: 'user', content: transcript });

        // Get AI response from Groq
        const reply = await getGroqResponse(transcript, conversationHistory, systemPrompt);
        if (reply) {
          console.log('AI reply:', reply);
          conversationHistory.push({ role: 'assistant', content: reply });

          // Convert to speech via Fish Audio
          const audioBuffer = await fishTTS(reply);
          if (audioBuffer && ws.readyState === WebSocket.OPEN) {
            // Send audio back to Jambonz
            ws.send(audioBuffer);
          }
        }
      }
    });

    deepgramWs.on('error', (err) => console.error('Deepgram error:', err));
  }

  connectDeepgram();

  // Receive audio from Jambonz (G.711 mu-law)
  ws.on('message', (data) => {
    if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.send(data);
    }
  });

  ws.on('close', () => {
    console.log('Call disconnected');
    if (deepgramWs) deepgramWs.close();

    // Analyze call and save to DB
    if (conversationHistory.length > 0) {
      analyzeAndSave(conversationHistory).catch(console.error);
    }
  });
});

// Groq LLM
async function getGroqResponse(message, history, systemPrompt) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('Groq error:', err);
    return null;
  }
}

// Fish Audio TTS
async function fishTTS(text) {
  try {
    const cleanText = text.replace(/\[END_CALL\]/g, '').trim();
    if (!cleanText) return null;

    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FISH_API_KEY}`,
        'Content-Type': 'application/json',
        'model': 's2-pro',
      },
      body: JSON.stringify({
        text: cleanText,
        format: 'pcm',
        sample_rate: 8000,
        latency: 'low',
        temperature: 0.7,
      }),
    });

    if (!res.ok) return null;

    // Collect streaming response
    const chunks = [];
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const audioData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(audioData);
  } catch (err) {
    console.error('Fish TTS error:', err);
    return null;
  }
}

// Post-call analysis
async function analyzeAndSave(history) {
  // Call VOXI API to analyze and save
  try {
    await fetch(`${process.env.VOXI_API_URL}/api/calls/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: history }),
    });
  } catch {}
}
```

### Task 3: Dockerfile для pipeline

**Create:** `/opt/voxi/pipeline/Dockerfile`
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

---

## Phase 3: Jambonz Setup (1 час)

### Task 4: Docker Compose

**Create:** `/opt/voxi/docker-compose.yml`
```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: voxi
      POSTGRES_USER: voxi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Jambonz SIP Gateway
  jambonz:
    image: jambonz/jambonz-mini:latest
    restart: always
    network_mode: host  # Required for SIP/RTP
    environment:
      - JAMBONZ_ADMIN_PORT=3001
      - JAMBONZ_API_BASE_URL=http://localhost:3001
    volumes:
      - jambonz_data:/opt/jambonz

  # Voice Pipeline
  pipeline:
    build: ./pipeline
    restart: always
    ports:
      - "8080:8080"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - FISH_AUDIO_API_KEY=${FISH_AUDIO_API_KEY}
      - DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
      - BOT_PROMPT=${BOT_PROMPT}
      - VOXI_API_URL=http://localhost:3000
      - PIPELINE_PORT=8080
    depends_on:
      - postgres

  # Next.js Frontend
  nextjs:
    build: ./frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://voxi:${DB_PASSWORD}@postgres:5432/voxi
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://voxi.kz
      - GROQ_API_KEY=${GROQ_API_KEY}
      - FISH_AUDIO_API_KEY=${FISH_AUDIO_API_KEY}
      - VAPI_API_KEY=${VAPI_API_KEY}
      - NEXT_PUBLIC_VAPI_PUBLIC_KEY=${NEXT_PUBLIC_VAPI_PUBLIC_KEY}
    depends_on:
      - postgres

volumes:
  pgdata:
  jambonz_data:
```

### Task 5: Environment file

**Create:** `/opt/voxi/.env`
```bash
DB_PASSWORD=your_db_password
NEXTAUTH_SECRET=your_nextauth_secret
GROQ_API_KEY=your_groq_key
FISH_AUDIO_API_KEY=your_fish_audio_key
DEEPGRAM_API_KEY=your_deepgram_key
VAPI_API_KEY=your_vapi_key
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
BOT_PROMPT=your_bot_prompt
```

---

## Phase 4: Jambonz + Beeline SIP Config (30 мин)

### Task 6: Настроить Jambonz через Admin UI

После `docker compose up -d`:

1. Открыть http://195.210.47.19:3001 (Jambonz Admin)
2. **Carriers → Add Carrier:**
   - Name: `Beeline KZ`
   - SIP Gateway: `46.227.186.229:5060`
   - Outbound: enabled
   - Inbound: enabled
   - Codec: G.711 a-law (PCMA)

3. **Phone Numbers → Add:**
   - Number: `77719444506`
   - Carrier: Beeline KZ
   - Application: VOXI Bot (create below)

4. **Applications → Add:**
   - Name: `VOXI Bot`
   - Call Hook: `ws://localhost:8080` (our pipeline WebSocket)
   - Status Hook: `http://localhost:3000/api/webhooks/jambonz`

5. **SIP Trunk Registration:**
   - Jambonz auto-registers to Beeline SIP
   - Verify: check Jambonz logs for `REGISTER 200 OK`

### Task 7: Webhook для Jambonz

**Create:** `/opt/voxi/frontend/src/app/api/webhooks/jambonz/route.ts`
```typescript
// Handle Jambonz call events (call started, ended, etc.)
// Save call records to DB
// Trigger post-call analysis
```

---

## Phase 5: Next.js Dockerfile (30 мин)

### Task 8: Dockerfile для фронтенда

**Create:** `/opt/voxi/frontend/Dockerfile`
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add to `next.config.ts`:
```typescript
output: 'standalone'
```

---

## Phase 6: Nginx + SSL (20 мин)

### Task 9: Nginx reverse proxy

**Create:** `/etc/nginx/sites-available/voxi`
```nginx
server {
    listen 80;
    server_name voxi.kz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/voxi /etc/nginx/sites-enabled/
certbot --nginx -d voxi.kz
systemctl restart nginx
```

---

## Phase 7: Запуск и тест (20 мин)

### Task 10: Deploy

```bash
cd /opt/voxi
docker compose up -d --build

# Check logs
docker compose logs -f pipeline
docker compose logs -f jambonz

# Seed database
curl -X POST http://localhost:3000/api/seed
```

### Task 11: Test звонки

1. **Входящий:** Позвонить на 77719444506 → должен ответить AI бот
2. **Исходящий:** Через API `POST /api/calls { leadId, phone }` → Jambonz звонит через Beeline

---

## Порядок выполнения

1. Task 1 — VPS setup (30 мин)
2. Task 2-3 — Pipeline server (1 час)
3. Task 4-5 — Docker Compose (30 мин)
4. Task 6 — Jambonz + Beeline config (30 мин)
5. Task 7 — Jambonz webhook (20 мин)
6. Task 8 — Next.js Dockerfile (30 мин)
7. Task 9 — Nginx + SSL (20 мин)
8. Task 10-11 — Deploy + test (20 мин)

**Total: ~4 часа**

## Нужен Deepgram API ключ!

Для STT в pipeline нужен Deepgram API key. Регистрация: https://console.deepgram.com → бесплатно $200 кредитов.
