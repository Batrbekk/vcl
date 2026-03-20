# Backend + AI Voice Testing Implementation Plan

> **For Claude:** Use superpowers executing-plans skill to implement task-by-task.

**Goal:** Complete backend API routes for calls/leads/bot + in-browser AI voice testing with animated 3D orb (no real phone minutes spent)

**Architecture:** API routes handle CRUD for leads/calls/bot config + VAPI webhooks. Voice testing uses Google Gemini Live Audio API via WebSocket for real-time voice chat in browser with Three.js animated orb visualization (based on audio-orb reference). Bot page gets new "Тестирование" tab with live voice interface.

**Tech Stack:** Next.js 16 API Routes, Prisma 7, VAPI.ai webhooks, Google Gemini Live Audio API (@google/genai), Three.js, Web Audio API, WebSocket

---

## Phase 1: API Routes (Backend)

### Task 1: Leads CRUD API

**Files:**
- Create: `src/app/api/leads/route.ts` (GET all, POST create)
- Create: `src/app/api/leads/[id]/route.ts` (GET one, PATCH update, DELETE)

**Endpoints:**
- `GET /api/leads` — list leads for org (filter by stageId, status)
- `POST /api/leads` — create new lead
- `GET /api/leads/[id]` — get lead details with calls/messages
- `PATCH /api/leads/[id]` — update lead (move stage, edit fields)
- `DELETE /api/leads/[id]` — delete lead

### Task 2: Calls API

**Files:**
- Create: `src/app/api/calls/route.ts` (GET all, POST initiate)
- Create: `src/app/api/calls/[id]/route.ts` (GET with transcripts)

**Endpoints:**
- `GET /api/calls` — list calls for org (filter by direction, status, leadId)
- `POST /api/calls` — initiate outbound call via VAPI
- `GET /api/calls/[id]` — get call with transcripts

### Task 3: Bot Config API

**Files:**
- Create: `src/app/api/bot/route.ts` (GET config, PATCH update)

**Endpoints:**
- `GET /api/bot` — get org bot config
- `PATCH /api/bot` — update bot config (name, prompt, voice, greeting)

### Task 4: VAPI Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/vapi/route.ts`

**Handles VAPI events:**
- `call.started` → update Call status to IN_PROGRESS
- `call.ended` → update Call status to COMPLETED, save duration
- `transcript.complete` → save transcript entries
- `call.analysis` → save summary, sentiment, qualification

---

## Phase 2: AI Voice Testing in Browser

### Task 5: Install dependencies

```bash
npm install @google/genai three @types/three
```

### Task 6: Audio utilities (port from audio-orb)

**Files:**
- Create: `src/lib/audio/utils.ts` — PCM encode/decode (Float32↔Int16↔Base64)
- Create: `src/lib/audio/analyser.ts` — frequency analysis class (FFT 32-point)

### Task 7: Three.js Orb Visualization Component

**Files:**
- Create: `src/components/bot/voice-orb.tsx` — React component with Three.js
- Create: `src/lib/audio/sphere-shader.ts` — GLSL vertex shader
- Create: `src/lib/audio/backdrop-shader.ts` — GLSL fragment shader

**How it works:**
- Canvas element with Three.js renderer
- Icosphere with custom vertex shader deformed by audio frequencies
- Post-processing: UnrealBloomPass for glow
- Input audio frequencies → sphere deformation + camera orbit
- Output audio frequencies → sphere scale + time progression

### Task 8: Voice Chat Client Component

**Files:**
- Create: `src/components/bot/voice-chat.tsx`

**How it works:**
1. Connect to Gemini Live Audio via `@google/genai` SDK
2. Capture microphone (16kHz AudioContext)
3. Send PCM audio chunks via WebSocket to Gemini
4. Receive AI audio response chunks
5. Decode and play through output AudioContext (24kHz)
6. Feed both input/output to Analyser → drives orb animation
7. System prompt from org bot config (same prompt used for real calls)

**UI:**
- Large 3D orb in center
- Status text below (Подключение... / Говорите... / AI отвечает...)
- Start/Stop buttons
- Volume meter

### Task 9: Integrate into Bot page

**Files:**
- Modify: `src/components/bot/bot-settings.tsx` — Tab 3 "Тестирование"

**Replace current test call UI with:**
- Voice orb component (full tab width)
- "Начать разговор" button
- System prompt preview (from Tab 1)
- Note: "Тестирование не расходует минуты тарифа"

### Task 10: Environment variables

**Add to .env:**
```
GEMINI_API_KEY=your_gemini_api_key
```

**Add to next.config.ts:**
```typescript
env: { NEXT_PUBLIC_GEMINI_API_KEY: process.env.GEMINI_API_KEY }
```

---

## Execution Order

1. Tasks 1-4 (API routes) — can be parallel
2. Task 5 (install deps) — first
3. Tasks 6-7 (audio utils + orb) — parallel
4. Task 8 (voice chat) — depends on 6, 7
5. Task 9 (integration) — depends on 8
6. Task 10 (env vars) — anytime
