# VOXI — Полная архитектура системы

> Документ подготовлен на основе исследования best practices индустрии, документации ключевых технологий (Next.js, BullMQ, MongoDB, VAPI, Telnyx, WhatsApp Cloud API, ForteBank API) и анализа конкурентных решений (Retell AI, Bland AI, Synthflow, LiveKit).

---

## 1. Обзор системы

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VOXI PLATFORM                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ WhatsApp │  │Instagram │  │ Website  │  │  Входящий звонок │   │
│  │ Cloud API│  │   DM API │  │  Forms   │  │   (future)       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘   │
│       │              │             │                │               │
│       └──────────────┴─────────────┴────────────────┘               │
│                              │                                      │
│                    ┌─────────▼──────────┐                           │
│                    │  Ingestion Layer   │                           │
│                    │  (Webhook Router)  │                           │
│                    └─────────┬──────────┘                           │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│  ┌──────▼──────┐  ┌─────────▼────────┐  ┌───────▼───────┐        │
│  │  CRM Core   │  │   Voice Engine   │  │   Billing     │        │
│  │  (Kanban)   │  │   (VAPI + SIP)   │  │   (ForteBank) │        │
│  └──────┬──────┘  └─────────┬────────┘  └───────┬───────┘        │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              │                                      │
│                    ┌─────────▼──────────┐                           │
│                    │     Data Layer     │                           │
│                    │  MongoDB + Redis   │                           │
│                    └────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Архитектура MVP (Фаза 1) — Next.js Monolith

### 2.1. Структура проекта

```
voxi/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group — login, signup, forgot
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Protected group — основной интерфейс
│   │   │   ├── leads/page.tsx        # Kanban доска
│   │   │   ├── leads/[id]/page.tsx   # Карточка лида
│   │   │   ├── calls/page.tsx        # Журнал звонков
│   │   │   ├── bot/page.tsx          # Настройки AI-бота
│   │   │   ├── knowledge/page.tsx    # База знаний (PDF upload)
│   │   │   ├── integrations/page.tsx # Подключение каналов
│   │   │   ├── billing/page.tsx      # Подписка и тарифы
│   │   │   ├── settings/page.tsx     # Настройки компании
│   │   │   ├── team/page.tsx         # Управление менеджерами
│   │   │   └── layout.tsx            # Sidebar + header + auth guard
│   │   ├── api/                      # Route Handlers (API)
│   │   │   ├── webhooks/
│   │   │   │   ├── whatsapp/route.ts # WhatsApp Cloud API webhook
│   │   │   │   ├── instagram/route.ts# Instagram DM webhook
│   │   │   │   ├── vapi/route.ts     # VAPI call events webhook
│   │   │   │   ├── fortebank/route.ts# Payment notifications
│   │   │   │   └── lead-form/route.ts# Public API для форм на сайтах
│   │   │   ├── leads/route.ts        # CRUD лидов
│   │   │   ├── calls/route.ts        # Управление звонками
│   │   │   ├── bot/route.ts          # Настройки бота
│   │   │   ├── billing/route.ts      # Биллинг operations
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── kanban/                   # Kanban board components
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── Card.tsx
│   │   │   └── CardDetail.tsx
│   │   ├── chat/                     # WhatsApp chat widget
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── calls/                    # Call history & player
│   │   │   ├── CallLog.tsx
│   │   │   └── TranscriptViewer.tsx
│   │   └── ui/                       # Shared UI (shadcn/ui)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connection.ts         # MongoDB connection singleton
│   │   │   ├── models/               # Mongoose models
│   │   │   │   ├── Organization.ts
│   │   │   │   ├── User.ts
│   │   │   │   ├── Lead.ts
│   │   │   │   ├── Call.ts
│   │   │   │   ├── Pipeline.ts
│   │   │   │   ├── KnowledgeBase.ts
│   │   │   │   ├── BotConfig.ts
│   │   │   │   └── Subscription.ts
│   │   │   └── indexes.ts            # Index definitions
│   │   ├── queue/
│   │   │   ├── connection.ts         # Redis/BullMQ connection
│   │   │   ├── queues.ts             # Queue definitions
│   │   │   └── workers/
│   │   │       ├── call-worker.ts    # Обработка звонков
│   │   │       ├── retry-worker.ts   # Повторные попытки
│   │   │       ├── billing-worker.ts # Биллинг tasks
│   │   │       └── notification-worker.ts
│   │   ├── services/
│   │   │   ├── vapi.ts               # VAPI SDK wrapper
│   │   │   ├── telnyx.ts             # Telnyx API
│   │   │   ├── whatsapp.ts           # WhatsApp Cloud API
│   │   │   ├── instagram.ts          # Instagram Messaging API
│   │   │   ├── fortebank.ts          # ForteBank Payments
│   │   │   ├── ai-summary.ts         # LLM для резюме звонков
│   │   │   └── knowledge-rag.ts      # RAG для базы знаний
│   │   ├── auth/
│   │   │   ├── config.ts             # NextAuth / Auth.js config
│   │   │   ├── session.ts            # Session helpers
│   │   │   └── rbac.ts               # Role-based access control
│   │   └── utils/
│   │       ├── validators.ts         # Zod schemas
│   │       └── constants.ts
│   ├── hooks/                        # React hooks
│   │   ├── useKanban.ts
│   │   ├── useSocket.ts
│   │   └── useLeads.ts
│   └── types/                        # TypeScript types
│       ├── lead.ts
│       ├── call.ts
│       └── organization.ts
├── workers/                          # Standalone BullMQ workers (отдельный процесс)
│   ├── index.ts                      # Worker runner
│   ├── call-scheduler.ts
│   └── billing-scheduler.ts
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2.2. Технологический стек MVP

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| **Framework** | Next.js 16 (App Router) | SSR + API routes в одном, RSC для производительности |
| **UI** | React 19 + Tailwind CSS + shadcn/ui | Быстрая разработка, консистентный дизайн |
| **Kanban DnD** | @dnd-kit/core | Лучшая производительность для drag-and-drop в React |
| **Auth** | Auth.js (NextAuth v5) | RBAC, JWT sessions, OAuth providers |
| **Database** | MongoDB Atlas | Гибкая схема для CRM, бесплатный tier, Atlas Search |
| **ODM** | Mongoose 9 | Схемы, валидация, middleware, populate |
| **Cache/Queue** | Redis (Upstash) + BullMQ | Job scheduling, retry, delayed jobs |
| **Real-time** | Socket.io или Pusher | WebSocket для Kanban обновлений |
| **Voice AI** | VAPI.ai | Оркестрация STT→LLM→TTS, barge-in, webhooks |
| **Telephony** | Telnyx (SIP Trunk) | KZ номера, API provisioning, $0.01/мин |
| **Payments** | ForteBank E-commerce API | Subscriptions API, авторекуррент, KZT |
| **WhatsApp** | Meta Cloud API | Бесплатный хостинг, webhooks, templates |
| **Instagram** | Instagram Messaging API | Meta Graph API, unified с WhatsApp |
| **File Storage** | S3 / Cloudflare R2 | PDF базы знаний, записи звонков |
| **Deployment** | Vercel (app) + Railway (workers) | Edge functions, auto-scaling |
| **Validation** | Zod | Runtime type validation для API |

---

## 3. Модели данных (MongoDB)

### 3.1. Organization (Tenant)

```typescript
// Каждый клиент Voxi = Organization (мультитенант через orgId)
const OrganizationSchema = new Schema({
  name: { type: String, required: true },               // "АН Нурболат"
  slug: { type: String, unique: true },                  // "an-nurbolat"
  industry: { type: String, enum: ['realty', 'auto', 'medical', 'education', 'other'] },

  // Подписка
  plan: { type: String, enum: ['starter', 'business', 'enterprise'], default: 'starter' },
  planExpiresAt: Date,
  minutesUsed: { type: Number, default: 0 },
  minutesLimit: Number,

  // Интеграции (credentials зашифрованы)
  integrations: {
    whatsapp: {
      enabled: Boolean,
      phoneNumberId: String,
      accessToken: String,        // encrypted
      webhookVerifyToken: String,
    },
    instagram: {
      enabled: Boolean,
      pageId: String,
      accessToken: String,        // encrypted
    },
    telnyx: {
      connectionId: String,
      phoneNumber: String,        // +7 7xx xxx xxxx
    },
  },

  // Настройки
  workingHours: {
    timezone: { type: String, default: 'Asia/Almaty' },
    schedule: [{
      day: { type: Number, min: 0, max: 6 },  // 0=Mon
      start: String,  // "09:00"
      end: String,    // "18:00"
    }],
  },

  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
```

### 3.2. User

```typescript
const UserSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  email: { type: String, required: true },
  passwordHash: String,
  name: String,
  role: { type: String, enum: ['owner', 'admin', 'manager'], default: 'manager' },
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
```

### 3.3. Pipeline (Воронка)

```typescript
const PipelineSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, default: 'Основная воронка' },
  columns: [{
    id: { type: String, required: true },     // uuid
    name: String,                              // "Новый", "Квалифицирован"...
    color: String,                             // "#3B82F6"
    order: Number,
    isDefault: Boolean,                        // куда попадают новые лиды
    autoAction: {                              // что делать при попадании
      type: { type: String, enum: ['call', 'notify', 'none'] },
      delay: Number,                           // задержка в секундах
    },
  }],
  createdAt: { type: Date, default: Date.now },
});

PipelineSchema.index({ orgId: 1 });
```

### 3.4. Lead (Лид)

```typescript
const LeadSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
  columnId: String,                            // id колонки в pipeline

  // Контактные данные
  name: String,
  phone: { type: String, required: true },     // +7XXXXXXXXXX
  email: String,
  avatar: String,

  // Источник
  source: {
    channel: { type: String, enum: ['whatsapp', 'instagram', 'website', 'manual', 'phone'] },
    details: String,                           // "Написал в WhatsApp по объявлению X"
    utm: {
      source: String,
      medium: String,
      campaign: String,
    },
    originalMessage: String,                   // Первое сообщение лида
  },

  // Квалификация (заполняется AI после звонка)
  qualification: {
    score: { type: Number, min: 0, max: 100 },
    budget: String,
    need: String,
    timeline: String,
    notes: String,
  },

  // Назначение
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },

  // Теги
  tags: [String],

  // Custom fields (гибкость для разных индустрий)
  customFields: Schema.Types.Mixed,

  // Статус
  status: {
    type: String,
    enum: ['active', 'won', 'lost', 'archived'],
    default: 'active',
  },

  // Метаданные
  lastContactAt: Date,
  nextFollowUpAt: Date,
  callAttempts: { type: Number, default: 0 },
  maxCallAttempts: { type: Number, default: 3 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound indexes для быстрых запросов
LeadSchema.index({ orgId: 1, columnId: 1, updatedAt: -1 });
LeadSchema.index({ orgId: 1, status: 1 });
LeadSchema.index({ orgId: 1, 'source.channel': 1 });
LeadSchema.index({ orgId: 1, assignedTo: 1 });
LeadSchema.index({ orgId: 1, phone: 1 }, { unique: true });
LeadSchema.index({ nextFollowUpAt: 1 }, { sparse: true }); // для scheduler
```

### 3.5. Call (Звонок)

```typescript
const CallSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },

  // VAPI данные
  vapiCallId: { type: String, unique: true },
  vapiAssistantId: String,

  // Телефония
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  from: String,                                // +7 7xx номер Voxi
  to: String,                                  // номер лида
  telnyxCallControlId: String,

  // Тайминги
  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: Number,                            // секунды

  // Статус
  status: {
    type: String,
    enum: ['queued', 'ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed'],
    default: 'queued',
  },
  endReason: String,                           // "customer-ended", "bot-ended", "no-answer"

  // Контент
  transcript: [{
    role: { type: String, enum: ['bot', 'customer'] },
    text: String,
    timestamp: Number,                         // секунды от начала
  }],
  recordingUrl: String,                        // S3/R2 URL
  summary: String,                             // AI-резюме звонка
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },

  // Квалификация из звонка
  extractedData: {
    budget: String,
    need: String,
    timeline: String,
    objections: [String],
    nextAction: String,
  },

  // Результат
  outcome: {
    type: String,
    enum: ['qualified', 'not-interested', 'callback', 'wrong-number', 'voicemail'],
  },
  movedToColumn: String,                       // куда переместили лида

  // Стоимость
  cost: {
    vapiMinutes: Number,
    telnyxMinutes: Number,
    totalUsd: Number,
  },

  createdAt: { type: Date, default: Date.now },
});

CallSchema.index({ orgId: 1, createdAt: -1 });
CallSchema.index({ leadId: 1, createdAt: -1 });
CallSchema.index({ vapiCallId: 1 }, { unique: true });
CallSchema.index({ status: 1 });
```

### 3.6. BotConfig (Настройки AI-бота)

```typescript
const BotConfigSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },

  // Идентичность
  name: { type: String, default: 'Алия' },     // Имя бота
  greeting: String,                              // "Здравствуйте, {name}! Это {botName} из {company}."

  // VAPI Assistant config
  vapiAssistantId: String,

  // Голос
  voice: {
    provider: { type: String, enum: ['elevenlabs', 'cartesia'], default: 'elevenlabs' },
    voiceId: String,
    speed: { type: Number, default: 1.0 },
    language: { type: String, default: 'ru' },
  },

  // Промпт
  systemPrompt: String,                          // Основные инструкции для LLM
  qualificationQuestions: [String],              // Вопросы для квалификации

  // LLM
  llm: {
    provider: { type: String, enum: ['openai', 'anthropic'], default: 'openai' },
    model: { type: String, default: 'gpt-4o-mini' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 256 },
  },

  // Поведение
  behavior: {
    maxCallDuration: { type: Number, default: 300 },  // 5 мин макс
    silenceTimeout: { type: Number, default: 10 },     // 10 сек тишины → прощание
    retryAttempts: { type: Number, default: 3 },
    retryIntervals: [{ type: Number }],                // [1800, 7200, 86400] — сек
    callOnlyWorkingHours: { type: Boolean, default: true },
  },

  // Правила маршрутизации после звонка
  routing: {
    qualified: { columnId: String, notify: [{ type: Schema.Types.ObjectId, ref: 'User' }] },
    notInterested: { columnId: String },
    callback: { columnId: String },
    noAnswer: { columnId: String },
  },

  // База знаний
  knowledgeBase: [{
    fileId: String,          // S3 key
    fileName: String,
    fileType: String,
    uploadedAt: Date,
    vectorStoreId: String,   // для RAG
  }],

  updatedAt: { type: Date, default: Date.now },
});
```

### 3.7. Message (WhatsApp/Instagram сообщения)

```typescript
const MessageSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },

  channel: { type: String, enum: ['whatsapp', 'instagram'], required: true },

  direction: { type: String, enum: ['inbound', 'outbound'] },
  from: String,
  to: String,

  content: {
    type: { type: String, enum: ['text', 'image', 'document', 'audio', 'template'] },
    text: String,
    mediaUrl: String,
    templateName: String,
  },

  // Meta API data
  externalId: String,        // wamid / Instagram message id
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'] },

  sentBy: { type: Schema.Types.ObjectId, ref: 'User' },  // null = system/bot
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ orgId: 1, leadId: 1, createdAt: -1 });
MessageSchema.index({ externalId: 1 }, { sparse: true });
```

### 3.8. Subscription (Биллинг)

```typescript
const SubscriptionSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },

  // ForteBank data
  fortePlanId: String,
  forteSubscriptionId: String,
  forteCustomerId: String,
  cardMask: String,             // "4111 **** **** 1234"

  // План
  plan: { type: String, enum: ['starter', 'business', 'enterprise'] },
  priceKzt: Number,             // 25000, 75000, 150000
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },

  // Статус
  status: {
    type: String,
    enum: ['active', 'past_due', 'cancelled', 'trialing'],
    default: 'trialing',
  },
  trialEndsAt: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,

  // Usage
  minutesIncluded: Number,
  minutesUsed: { type: Number, default: 0 },
  overageRateKzt: Number,       // цена за доп. минуту

  // History
  payments: [{
    amount: Number,
    currency: { type: String, default: 'KZT' },
    status: String,
    fortePaymentId: String,
    paidAt: Date,
  }],

  cancelledAt: Date,
  cancelReason: String,
  createdAt: { type: Date, default: Date.now },
});
```

---

## 4. API Architecture

### 4.1. Webhook Pipeline (Ingestion Layer)

Все внешние события приходят через webhooks и обрабатываются по единому паттерну:

```
Webhook → Validate Signature → Parse → Enqueue Job → Return 200 OK
                                              │
                                     BullMQ Worker обрабатывает
                                     асинхронно (retry, backoff)
```

**Критически важно**: webhook endpoint ДОЛЖЕН вернуть 200 в течение 5-30 секунд (зависит от провайдера). Вся тяжёлая логика — в BullMQ worker.

```typescript
// src/app/api/webhooks/whatsapp/route.ts
export async function POST(req: Request) {
  // 1. Verify signature (HMAC-SHA256 от Meta)
  const signature = req.headers.get('x-hub-signature-256');
  const body = await req.text();
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Parse event
  const event = JSON.parse(body);

  // 3. Enqueue for async processing
  await whatsappQueue.add('process-message', {
    event,
    receivedAt: Date.now(),
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });

  // 4. Respond immediately
  return new Response('OK', { status: 200 });
}

// GET для верификации webhook (challenge-response от Meta)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}
```

### 4.2. Маршруты API

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| **Webhooks (public)** | | | |
| POST | `/api/webhooks/whatsapp` | WhatsApp Cloud API events | Signature |
| POST | `/api/webhooks/instagram` | Instagram DM events | Signature |
| POST | `/api/webhooks/vapi` | VAPI call status + transcript | Secret |
| POST | `/api/webhooks/fortebank` | Payment notifications | Signature |
| POST | `/api/webhooks/lead-form` | Public lead form submit | API Key |
| **Leads** | | | |
| GET | `/api/leads` | Список лидов (с фильтрами) | JWT |
| POST | `/api/leads` | Создать лида вручную | JWT |
| PATCH | `/api/leads/:id` | Обновить лида | JWT |
| PATCH | `/api/leads/:id/move` | Переместить в колонку | JWT |
| DELETE | `/api/leads/:id` | Архивировать лида | JWT+Admin |
| **Calls** | | | |
| GET | `/api/calls` | Журнал звонков | JWT |
| POST | `/api/calls/initiate` | Инициировать звонок лиду | JWT |
| GET | `/api/calls/:id/transcript` | Транскрипт звонка | JWT |
| **Pipeline** | | | |
| GET | `/api/pipeline` | Получить воронку | JWT |
| PUT | `/api/pipeline` | Обновить колонки | JWT+Admin |
| **Bot** | | | |
| GET | `/api/bot/config` | Настройки бота | JWT |
| PUT | `/api/bot/config` | Обновить настройки | JWT+Admin |
| POST | `/api/bot/knowledge` | Загрузить файл в базу знаний | JWT+Admin |
| **Messages** | | | |
| GET | `/api/messages/:leadId` | История переписки с лидом | JWT |
| POST | `/api/messages/:leadId/send` | Отправить сообщение через WA/IG | JWT |
| **Billing** | | | |
| GET | `/api/billing` | Текущая подписка | JWT |
| POST | `/api/billing/subscribe` | Оформить подписку | JWT+Owner |
| POST | `/api/billing/change-plan` | Сменить тариф | JWT+Owner |
| **Team** | | | |
| GET | `/api/team` | Список членов команды | JWT |
| POST | `/api/team/invite` | Пригласить менеджера | JWT+Admin |

### 4.3. Middleware (Auth + Tenant Isolation)

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const publicPaths = ['/login', '/signup', '/', '/api/webhooks'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Пропускаем публичные пути и webhook endpoints
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Проверяем JWT
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Inject orgId в headers для всех API routes
  const headers = new Headers(req.headers);
  headers.set('x-org-id', token.orgId as string);
  headers.set('x-user-id', token.sub as string);
  headers.set('x-user-role', token.role as string);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

---

## 5. Voice Engine (AI Звонки)

### 5.1. Архитектура звонка через VAPI

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Voxi CRM    │     │    VAPI.ai   │     │     Telnyx       │
│              │     │              │     │   SIP Trunk      │
│  BullMQ job  │────►│  Create Call │────►│  Outbound call   │
│  "call lead" │     │  (Assistant) │     │  +7 7xx → Lead   │
│              │     │              │     │                  │
│              │     │  STT→LLM→TTS│     │                  │
│              │◄────│  Webhooks:   │◄────│  Audio stream    │
│  Save result │     │  - started   │     │                  │
│  Move card   │     │  - ended     │     │                  │
│  Notify mgr  │     │  - transcript│     │                  │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 5.2. VAPI Assistant Configuration

```typescript
// lib/services/vapi.ts
import Vapi from '@vapi-ai/server-sdk';

const vapi = new Vapi({ token: process.env.VAPI_API_KEY });

export async function createOrUpdateAssistant(orgId: string, config: BotConfig) {
  const assistantPayload = {
    name: `voxi-${orgId}`,
    model: {
      provider: config.llm.provider,
      model: config.llm.model,
      temperature: config.llm.temperature,
      maxTokens: config.llm.maxTokens,
      messages: [{
        role: 'system',
        content: buildSystemPrompt(config),
      }],
    },
    voice: {
      provider: config.voice.provider,
      voiceId: config.voice.voiceId,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
      language: 'multi',  // русский + автоопределение
    },
    // Поведение
    firstMessage: config.greeting,
    endCallMessage: 'Спасибо за ваше время! До свидания.',
    maxDurationSeconds: config.behavior.maxCallDuration,
    silenceTimeoutSeconds: config.behavior.silenceTimeout,
    backgroundSound: 'off',
    backchannelingEnabled: true,     // "угу", "понял"

    // Webhook для получения событий
    serverUrl: `${process.env.APP_URL}/api/webhooks/vapi`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
  };

  if (config.vapiAssistantId) {
    return vapi.assistants.update(config.vapiAssistantId, assistantPayload);
  }
  return vapi.assistants.create(assistantPayload);
}

export async function initiateCall(lead: Lead, botConfig: BotConfig) {
  return vapi.calls.create({
    assistantId: botConfig.vapiAssistantId,
    phoneNumber: {
      twilioPhoneNumber: lead.phone,  // номер лида
    },
    customer: {
      number: lead.phone,
      name: lead.name,
    },
    // Контекст для LLM — бот знает откуда пришёл лид
    assistantOverrides: {
      model: {
        messages: [{
          role: 'system',
          content: `Контекст лида: ${lead.source.details}. Имя: ${lead.name}.`,
        }],
      },
    },
  });
}
```

### 5.3. VAPI Webhook Handler

```typescript
// src/app/api/webhooks/vapi/route.ts
export async function POST(req: Request) {
  const secret = req.headers.get('x-vapi-secret');
  if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await req.json();

  switch (event.message.type) {
    case 'status-update':
      await vapiEventsQueue.add('status-update', event);
      break;
    case 'end-of-call-report':
      // Самое важное событие — звонок завершён
      await vapiEventsQueue.add('call-ended', event, {
        priority: 1,  // высокий приоритет
      });
      break;
    case 'transcript':
      await vapiEventsQueue.add('transcript', event);
      break;
    case 'function-call':
      // VAPI просит вызвать функцию (tool call)
      return handleFunctionCall(event);
    case 'hang':
      // VAPI нужен ответ — "что делать дальше?"
      return handleHangEvent(event);
  }

  return new Response('OK', { status: 200 });
}
```

### 5.4. Call Worker (BullMQ)

```typescript
// workers/call-scheduler.ts
import { Worker, Queue } from 'bullmq';

const callQueue = new Queue('calls', { connection: redis });

// Worker: обработка завершённого звонка
const callWorker = new Worker('vapi-events', async (job) => {
  if (job.name === 'call-ended') {
    const report = job.data.message;

    // 1. Сохранить транскрипт и запись
    const call = await Call.findOneAndUpdate(
      { vapiCallId: report.call.id },
      {
        status: 'completed',
        duration: report.call.duration,
        transcript: report.artifact.transcript,
        recordingUrl: report.artifact.recordingUrl,
        summary: report.artifact.summary,
        endedAt: new Date(),
      },
      { new: true }
    );

    // 2. AI квалификация — извлечь структурированные данные из транскрипта
    const qualification = await extractQualification(report.artifact.transcript);

    // 3. Обновить лида
    const lead = await Lead.findById(call.leadId);
    lead.qualification = qualification;
    lead.lastContactAt = new Date();

    // 4. Переместить карточку в нужную колонку
    const botConfig = await BotConfig.findOne({ orgId: call.orgId });
    const targetColumn = botConfig.routing[qualification.outcome]?.columnId;
    if (targetColumn) {
      lead.columnId = targetColumn;
    }
    await lead.save();

    // 5. Уведомить менеджеров (WebSocket + push)
    await notifyManagers(call.orgId, {
      type: 'call-completed',
      leadId: lead._id,
      summary: call.summary,
      outcome: qualification.outcome,
    });
  }
}, { connection: redis, concurrency: 10 });

// Worker: планирование повторных звонков
const retryWorker = new Worker('call-retry', async (job) => {
  const { leadId, attempt } = job.data;
  const lead = await Lead.findById(leadId);
  const botConfig = await BotConfig.findOne({ orgId: lead.orgId });

  // Проверить рабочие часы
  if (!isWithinWorkingHours(lead.orgId)) {
    // Перенести на начало следующего рабочего дня
    const nextWorkStart = getNextWorkingHourStart(lead.orgId);
    await callQueue.add('retry-call', { leadId, attempt }, {
      delay: nextWorkStart.getTime() - Date.now(),
    });
    return;
  }

  // Инициировать звонок
  await initiateCall(lead, botConfig);
  lead.callAttempts = attempt;
  await lead.save();

}, { connection: redis, concurrency: 5 });
```

### 5.5. Оптимизация скорости ответа AI-бота (Latency Engineering)

Скорость ответа — **главный фактор**, определяющий, воспримет ли клиент бота как живого собеседника или как тормозную IVR-систему. Цель: **< 800ms** от конца речи клиента до начала ответа бота.

#### Анатомия задержки

```
Клиент перестал говорить
     │
     ├── VAD (Voice Activity Detection)    ~200-300ms  ← настраивается
     ├── STT (Speech-to-Text)              ~150-400ms  ← выбор провайдера
     ├── LLM (генерация ответа)            ~300-1500ms ← главный bottleneck
     ├── TTS (Text-to-Speech)              ~90-400ms   ← выбор провайдера
     │
     ▼
Бот начал говорить
─────────────────────────────────────────────────
Без оптимизации:     1.0 — 2.5 сек  ❌ Ощущается как задержка
С оптимизацией:      500 — 800ms    ✅ Естественный разговор
```

#### Стратегия 1: Выбор самых быстрых провайдеров

| Компонент | Быстрый вариант | Latency | Альтернатива | Latency |
|-----------|----------------|---------|-------------|---------|
| **STT** | Deepgram Nova-3 (streaming) | ~150ms | Whisper | ~800ms |
| **LLM** | GPT-4o-mini | ~300ms TTFT | Claude Haiku | ~350ms |
| **TTS** | Cartesia Sonic | ~90ms | ElevenLabs Turbo v2.5 | ~300ms |

**Оптимальный стек для минимальной задержки:**
```
Deepgram Nova-3 (~150ms) → GPT-4o-mini (~300ms) → Cartesia Sonic (~90ms)
= ~540ms total pipeline latency
```

**Для максимального качества голоса (premium клиенты):**
```
Deepgram Nova-3 (~150ms) → GPT-4o-mini (~300ms) → ElevenLabs Turbo v2.5 (~300ms)
= ~750ms total pipeline latency
```

#### Стратегия 2: VAPI конфигурация для скорости

```typescript
// Оптимизированный VAPI Assistant для минимальной latency
const speedOptimizedAssistant = {
  // STT — streaming mode обязателен
  transcriber: {
    provider: 'deepgram',
    model: 'nova-3',
    language: 'multi',
    smartFormat: false,        // отключить — добавляет задержку
    endpointing: 200,         // VAD sensitivity: 200ms паузы = конец фразы
                               // Меньше = быстрее реакция, но может обрезать речь
                               // 200-300ms — оптимум для русского языка
  },

  // LLM — короткие ответы = быстрая генерация
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 150,            // КРИТИЧНО: короткие ответы = меньше токенов = быстрее
    messages: [{
      role: 'system',
      content: `{systemPrompt}

КРИТИЧЕСКИЕ ПРАВИЛА ДЛЯ СКОРОСТИ:
- Отвечай КОРОТКИМИ фразами: 1-2 предложения максимум
- НЕ повторяй то, что сказал клиент
- НЕ используй вводные конструкции ("Отличный вопрос!", "Хороший выбор!")
- Сразу переходи к сути
- Если нужно задать вопрос — задавай сразу, без прелюдии
- Используй разговорный стиль: "Да, есть варианты от 50 млн. Какой район интересует?"
`,
    }],
  },

  // TTS — Cartesia для скорости ИЛИ ElevenLabs для качества
  voice: {
    provider: 'cartesia',
    voiceId: 'russian-female-1',  // ID русского голоса
    speed: 1.05,                   // Чуть быстрее нормы — ощущается естественнее
    // chunkPlan: {
    //   enabled: true,            // Streaming TTS — начинает говорить до полной генерации
    //   minCharacters: 30,        // Начать озвучку после 30 символов
    // },
  },

  // Поведение — маскировка задержки
  backchannelingEnabled: true,     // "угу", "понял" — заполняет паузы
  backgroundDenoisingEnabled: true,
  hipaaEnabled: false,

  // Filler words — бот говорит "Секундочку..." пока LLM думает
  // Это КРИТИЧНО для UX — клиент не слышит мёртвую тишину
  fillerInjectionEnabled: true,
};
```

#### Стратегия 3: Prompt Engineering для скорости

Длина промпта напрямую влияет на время первого токена (TTFT). Каждые ~500 токенов в system prompt добавляют ~50-100ms к TTFT.

```typescript
// ❌ ПЛОХО — раздутый промпт (2000+ токенов → +200-400ms latency)
const slowPrompt = `
Ты — профессиональный менеджер по продажам компании "АН Нурболат".
Твоя задача — квалифицировать потенциального клиента, который оставил
заявку на нашем сайте. Ты должен быть вежливым, но настойчивым.
Тебе нужно выяснить следующую информацию: бюджет покупателя,
предпочтительный район проживания, количество комнат, срочность покупки.
При этом нужно учитывать, что клиент может быть занят, может не хотеть
разговаривать, может задавать встречные вопросы. В каждом из этих случаев...
[ещё 1500 токенов инструкций]
`;

// ✅ ХОРОШО — компактный промпт (400 токенов → минимальная latency)
const fastPrompt = `
Ты Алия из АН Нурболат. Квалифицируй лида за 2-3 минуты.

Выясни: 1) бюджет 2) район 3) комнаты 4) сроки

Стиль: короткие фразы, дружелюбно, по делу. Не лей воду.
Если клиент занят → предложи перезвонить.
Если не интересно → вежливо попрощайся.

Цены: студии от 25 млн, 1к от 35 млн, 2к от 50 млн, 3к от 70 млн.
Районы: Алматы, Астана, Шымкент.
`;
```

#### Стратегия 4: Streaming (конвейерная обработка)

VAPI автоматически использует streaming между компонентами — TTS начинает синтезировать речь **до того**, как LLM закончит генерировать весь ответ:

```
Без streaming (sequential):
STT ████████ → LLM ████████████████ → TTS ████████ = 2000ms

С streaming (pipeline):
STT ████████ →
              LLM ████░░░░░░░░░░░░ →
                   TTS ████░░░░░░      = 800ms
                        ▲
                        Бот уже говорит, пока LLM ещё генерирует
```

VAPI включает это по умолчанию. Чтобы максимизировать эффект:
- `maxTokens: 150` — LLM генерирует меньше, streaming быстрее схлопывает pipeline
- Cartesia Sonic поддерживает streaming input — начинает синтез с первых слов

#### Стратегия 5: Filler Words и Backchannel (маскировка задержки)

Даже при ~700ms pipeline latency, клиент может воспринять паузу как "тормоза". Решение — заполнители:

```typescript
// VAPI fillerInjectionEnabled: true заставляет бота
// произносить короткие фразы пока LLM думает:

// При обычном вопросе: "Да, сейчас посмотрю..." (100ms TTS)
// При сложном вопросе: "Хороший вопрос, секунду..." (100ms TTS)
// При перебивании (barge-in): бот мгновенно замолкает и слушает

// Backchannel — бот вставляет "угу", "понял", "так" пока клиент говорит
// Это создаёт ощущение живого диалога
```

#### Стратегия 6: Кэширование контекста

```typescript
// При звонке передаём минимальный контекст лида (не всю историю)
assistantOverrides: {
  model: {
    messages: [{
      role: 'system',
      // Только ключевые факты — меньше токенов = быстрее
      content: `Лид: ${lead.name}. Источник: ${lead.source.channel}. `
             + `Запрос: "${lead.source.originalMessage}". `
             + (lead.qualification?.notes ? `Заметки: ${lead.qualification.notes}` : ''),
    }],
  },
},
```

#### Стратегия 7: Knowledge Base / RAG оптимизация

RAG-запросы (поиск по базе знаний) добавляют 200-500ms к каждому ответу. Оптимизация:

```typescript
// Вместо RAG на каждый ответ — предзагрузить FAQ в system prompt
// Для компактных баз знаний (<2000 токенов) это быстрее чем RAG

// ❌ RAG на каждый turn: +300ms
// ✅ FAQ в промпте: +0ms (уже в контексте LLM)

const systemPromptWithFaq = `
${basePrompt}

ЧАСТЫЕ ВОПРОСЫ (отвечай из этих данных, не выдумывай):
- Рассрочка: да, от 3 банков, первый взнос от 20%
- Ипотека: от 18% годовых, одобрение за 3 дня
- Сдача дома: 4 квартал 2026
- Парковка: подземная, 5 млн за место
`;

// Для больших баз (>2000 токенов) — RAG через VAPI Knowledge Base
// VAPI кэширует embeddings, повторные запросы быстрее
```

#### Стратегия 8: Мониторинг latency

```typescript
// Трекинг latency каждого звонка через VAPI end-of-call-report
interface CallLatencyMetrics {
  avgResponseTime: number;    // среднее время ответа бота (цель: <800ms)
  maxResponseTime: number;    // максимальная задержка за звонок
  p95ResponseTime: number;    // 95-й перцентиль
  sttLatency: number;         // время STT
  llmLatency: number;         // время LLM (TTFT)
  ttsLatency: number;         // время TTS
  totalTurns: number;         // количество "turns" в разговоре
}

// Сохраняем в Call model для аналитики
const callUpdate = {
  latencyMetrics: {
    avgResponseTime: report.artifact.avgResponseTime,
    // VAPI предоставляет эти метрики в end-of-call-report
  },
};

// Алерт если latency деградирует
if (metrics.p95ResponseTime > 1500) {
  await notifyAdmin(orgId, {
    type: 'latency-alert',
    message: `P95 latency ${metrics.p95ResponseTime}ms превышает порог 1500ms`,
    suggestion: 'Проверить размер system prompt или переключить TTS на Cartesia',
  });
}
```

#### Итоговая матрица выбора стека по скорости

| Приоритет | STT | LLM | TTS | Ожидаемая latency | Стоимость/мин |
|-----------|-----|-----|-----|-------------------|---------------|
| **Максимальная скорость** | Deepgram Nova-3 | GPT-4o-mini | Cartesia Sonic | **~500-600ms** | ~$0.10 |
| **Баланс скорость/качество** | Deepgram Nova-3 | GPT-4o-mini | ElevenLabs Turbo v2.5 | **~700-900ms** | ~$0.15 |
| **Максимальное качество** | Deepgram Nova-3 | GPT-4o | ElevenLabs v2 | **~1.2-1.8s** | ~$0.25 |

**Рекомендация для MVP**: начать с "Баланс" — Deepgram + GPT-4o-mini + ElevenLabs Turbo. Если клиенты жалуются на задержку — переключить TTS на Cartesia Sonic (это изменение одной строки в VAPI config).

---

## 6. Каналы коммуникации

### 6.1. WhatsApp Cloud API

```
┌────────────┐     ┌────────────────┐     ┌──────────────┐
│   Client   │────►│  Meta Cloud    │────►│  Voxi        │
│  WhatsApp  │     │  API Servers   │     │  Webhook     │
│            │◄────│                │◄────│  /api/wh/wa  │
└────────────┘     └────────────────┘     └──────┬───────┘
                                                  │
                                          BullMQ Worker
                                                  │
                                          ┌───────▼───────┐
                                          │  1. Find/Create│
                                          │     Lead      │
                                          │  2. Save msg  │
                                          │  3. Auto-reply│
                                          │     or queue  │
                                          │     call      │
                                          └───────────────┘
```

**Процесс обработки входящего сообщения:**
1. Meta отправляет POST на `/api/webhooks/whatsapp`
2. Verify HMAC-SHA256 signature
3. Parse: извлечь `from`, `text`, `mediaUrl`
4. BullMQ job: найти или создать лида по номеру телефона
5. Сохранить сообщение в `Messages`
6. Если лид новый → создать карточку → запланировать звонок
7. Если лид существующий → уведомить назначенного менеджера

**Отправка сообщений от менеджера:**

```typescript
// lib/services/whatsapp.ts
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );
  return response.json();
}
```

### 6.2. Instagram Messaging API

Работает через тот же Meta Graph API. Webhook endpoint аналогичен WhatsApp. Особенности:
- Нужен Facebook Page, подключённый к Instagram Business Account
- Permissions: `instagram_manage_messages`, `pages_messaging`
- Webhooks: `messages`, `messaging_postbacks`
- Ограничение: нельзя инициировать переписку — только отвечать на DM от пользователя

### 6.3. Website Lead Form (Public API)

```typescript
// POST /api/webhooks/lead-form
// Public endpoint с API key authentication
export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  const org = await Organization.findOne({ 'apiKey': apiKey });
  if (!org) return new Response('Invalid API key', { status: 401 });

  const body = await req.json();
  // Validate with Zod
  const data = leadFormSchema.parse(body);

  await leadQueue.add('new-lead', {
    orgId: org._id,
    ...data,
    source: { channel: 'website' },
  });

  return Response.json({ success: true });
}
```

---

## 7. Real-time (Kanban обновления)

### 7.1. Подход: Socket.io через отдельный сервер

Next.js App Router не имеет нативной поддержки WebSocket. Варианты:

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| **Pusher / Ably** | Zero-config, hosted, масштабируется | $$$, зависимость от третьей стороны |
| **Socket.io (отдельный процесс)** | Полный контроль, бесплатно | Нужен отдельный сервер |
| **Server-Sent Events (SSE)** | Простота, работает с App Router | Только server→client, не двусторонний |

**Рекомендация для MVP**: Pusher (или Ably) — быстро подключить, бесплатный tier до 200 concurrent connections. Для масштаба — мигрировать на Socket.io.

```typescript
// lib/realtime.ts
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

export function broadcastToOrg(orgId: string, event: string, data: any) {
  pusher.trigger(`org-${orgId}`, event, data);
}

// Использование в workers:
// broadcastToOrg(lead.orgId, 'lead-moved', { leadId, fromColumn, toColumn });
// broadcastToOrg(call.orgId, 'call-completed', { callId, summary });
```

```typescript
// hooks/useSocket.ts (client)
import Pusher from 'pusher-js';

export function useRealtimeUpdates(orgId: string) {
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`org-${orgId}`);

    channel.bind('lead-moved', (data) => {
      // Обновить Kanban доску
      queryClient.invalidateQueries(['leads']);
    });

    channel.bind('call-completed', (data) => {
      // Показать toast notification
      toast.success(`Звонок завершён: ${data.summary}`);
    });

    channel.bind('new-message', (data) => {
      // Обновить чат
      queryClient.invalidateQueries(['messages', data.leadId]);
    });

    return () => { pusher.unsubscribe(`org-${orgId}`); };
  }, [orgId]);
}
```

---

## 8. Биллинг (ForteBank)

### 8.1. Процесс подписки

```
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│  Клиент  │────►│  ForteBank       │────►│  Voxi        │
│  Браузер │     │  Payment Widget  │     │  Webhook     │
│          │     │  (PCI DSS)       │     │              │
│          │◄────│  Результат       │◄────│  Activate    │
└──────────┘     └──────────────────┘     └──────────────┘

1. Клиент выбирает тариф → Voxi создаёт Plan + Customer в ForteBank API
2. ForteBank виджет показывается клиенту → ввод карты (PCI-safe)
3. Первый платёж → ForteBank шлёт webhook → Voxi активирует подписку
4. Автосписание каждый месяц → ForteBank webhook → Voxi обновляет статус
5. Если списание не удалось → retry (настроено в ForteBank Plan)
```

### 8.2. Тарифные планы

| | Starter | Business | Enterprise |
|---|---------|----------|------------|
| **Цена** | 25 000 ₸/мес | 75 000 ₸/мес | 150 000 ₸/мес |
| **Минуты AI-звонков** | 100 мин | 500 мин | 2000 мин |
| **Менеджеров** | 2 | 10 | 50 |
| **Каналы** | WhatsApp | WA + Instagram | WA + IG + API |
| **База знаний** | 5 файлов | 20 файлов | Безлимит |
| **Доп. минута** | 500 ₸ | 400 ₸ | 300 ₸ |

### 8.3. Billing Worker

```typescript
// workers/billing-scheduler.ts
// Запускается по cron через BullMQ Repeatable Jobs

const billingQueue = new Queue('billing', { connection: redis });

// Ежедневная проверка usage
billingQueue.add('check-usage', {}, {
  repeat: { pattern: '0 0 * * *' },  // каждый день в полночь
});

const billingWorker = new Worker('billing', async (job) => {
  if (job.name === 'check-usage') {
    // Найти организации, превысившие лимит
    const orgs = await Organization.find({
      'minutesUsed': { $gte: '$minutesLimit' },
      'plan': { $ne: 'enterprise' },
    });

    for (const org of orgs) {
      // Уведомить о превышении лимита
      await notifyOwner(org._id, {
        type: 'usage-limit-reached',
        minutesUsed: org.minutesUsed,
        minutesLimit: org.minutesLimit,
      });
    }
  }
}, { connection: redis });
```

---

## 9. Безопасность

### 9.1. Аутентификация и авторизация

```
┌─────────────────────────────────────────────────────┐
│                     Auth Flow                        │
│                                                     │
│  Login → Auth.js → JWT (httpOnly cookie)            │
│            │                                        │
│            ├── Middleware: verify JWT + inject orgId │
│            │                                        │
│            ├── API Route: check role (RBAC)          │
│            │     owner > admin > manager             │
│            │                                        │
│            └── Data Layer: EVERY query filtered by   │
│                orgId (tenant isolation)              │
└─────────────────────────────────────────────────────┘
```

### 9.2. Tenant Isolation (критически важно)

```typescript
// lib/db/tenant.ts — обёртка для всех запросов
export function withTenant<T>(orgId: string, query: FilterQuery<T>): FilterQuery<T> {
  return { ...query, orgId };
}

// Использование:
const leads = await Lead.find(withTenant(orgId, { status: 'active' }));
// → { orgId: "abc123", status: "active" }
```

**Правила:**
- Каждая модель содержит `orgId`
- Каждый запрос к БД ДОЛЖЕН фильтровать по `orgId`
- Mongoose middleware (pre-find hooks) автоматически добавляет `orgId` фильтр

### 9.3. Шифрование секретов

```typescript
// Credentials интеграций (WhatsApp tokens, etc.) хранятся зашифрованными
// AES-256-GCM encryption at rest
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, data] = encrypted.split(':');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 9.4. Webhook Security Checklist

| Webhook | Метод верификации |
|---------|------------------|
| WhatsApp (Meta) | HMAC-SHA256 signature в `x-hub-signature-256` |
| Instagram (Meta) | Тот же HMAC-SHA256 |
| VAPI | Shared secret в `x-vapi-secret` header |
| ForteBank | Digital signature на callback URL |
| Lead Form API | API Key в `x-api-key` header |

---

## 10. Инфраструктура и деплой

### 10.1. Схема деплоя

```
┌──────────────────────────────────────────────────────────┐
│                    Production Environment                 │
│                                                          │
│  ┌────────────────┐    ┌─────────────────────────┐      │
│  │   Vercel       │    │   Railway / Render       │      │
│  │                │    │                          │      │
│  │  Next.js App   │    │  BullMQ Workers          │      │
│  │  (App Router)  │    │  ├── call-worker         │      │
│  │  ├── Pages     │    │  ├── retry-worker        │      │
│  │  ├── API       │    │  ├── billing-worker      │      │
│  │  └── Webhooks  │    │  └── notification-worker │      │
│  │                │    │                          │      │
│  └───────┬────────┘    └────────────┬─────────────┘      │
│          │                          │                    │
│          └──────────┬───────────────┘                    │
│                     │                                    │
│          ┌──────────▼──────────┐                         │
│          │  MongoDB Atlas      │                         │
│          │  (M10 Dedicated)    │                         │
│          └──────────┬──────────┘                         │
│                     │                                    │
│          ┌──────────▼──────────┐                         │
│          │  Upstash Redis      │                         │
│          │  (Serverless)       │                         │
│          └─────────────────────┘                         │
│                                                          │
│          ┌─────────────────────┐                         │
│          │  Cloudflare R2      │                         │
│          │  (Files & Records)  │                         │
│          └─────────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

### 10.2. Переменные окружения

```bash
# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.voxi.kz

# Encryption
ENCRYPTION_KEY=...  # 64 hex chars (32 bytes)

# VAPI
VAPI_API_KEY=...
VAPI_WEBHOOK_SECRET=...

# Telnyx
TELNYX_API_KEY=...
TELNYX_CONNECTION_ID=...
TELNYX_PHONE_NUMBER=+77...

# WhatsApp (Meta)
WA_PHONE_NUMBER_ID=...
WA_ACCESS_TOKEN=...
WA_VERIFY_TOKEN=...
WA_APP_SECRET=...  # для HMAC верификации

# Instagram
IG_PAGE_ID=...
IG_ACCESS_TOKEN=...

# ForteBank
FORTE_MERCHANT_ID=...
FORTE_API_KEY=...
FORTE_WEBHOOK_SECRET=...

# Real-time
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=voxi-files

# AI
OPENAI_API_KEY=...
```

---

## 11. Очереди задач (BullMQ)

### 11.1. Определение очередей

| Очередь | Назначение | Concurrency | Retry |
|---------|-----------|-------------|-------|
| `leads` | Создание лидов из webhooks | 10 | 3x exponential |
| `calls` | Инициация звонков через VAPI | 5 | 3x fixed 30s |
| `call-retry` | Повторные попытки звонков | 3 | 3x exponential |
| `vapi-events` | Обработка webhook от VAPI | 10 | 3x exponential |
| `whatsapp` | Обработка WA сообщений | 10 | 3x exponential |
| `instagram` | Обработка IG сообщений | 5 | 3x exponential |
| `billing` | Биллинг-задачи (cron) | 1 | 5x exponential |
| `notifications` | Push / email уведомления | 10 | 3x fixed 5s |

### 11.2. Паттерны

```typescript
// Idempotent jobs — безопасный retry
// Каждый job имеет уникальный jobId чтобы избежать дублирования
await callQueue.add('initiate-call', {
  leadId: lead._id,
  attempt: 1,
}, {
  jobId: `call-${lead._id}-attempt-1`,  // дедупликация
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 86400 },      // удалить через 24ч
  removeOnFail: { age: 604800 },         // хранить failed 7 дней
});

// Delayed job — повторный звонок через 30 минут
await callQueue.add('initiate-call', {
  leadId: lead._id,
  attempt: 2,
}, {
  jobId: `call-${lead._id}-attempt-2`,
  delay: 30 * 60 * 1000,  // 30 минут
});

// Step jobs — сложные процессы с checkpoint
// (см. BullMQ Process Step Jobs паттерн)
```

---

## 12. Фаза 2 — Микросервисная архитектура (после PMF)

### 12.1. Целевая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong/Traefik)               │
│                        + Rate Limiting                       │
│                        + Auth (JWT verify)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬──────────────┐
        │             │             │              │
  ┌─────▼────┐  ┌─────▼────┐  ┌────▼─────┐  ┌────▼──────┐
  │ CRM      │  │ Voice    │  │ Integr.  │  │ Billing   │
  │ Service  │  │ Service  │  │ Service  │  │ Service   │
  │ (TS)     │  │ (Go)     │  │ (TS)     │  │ (TS)      │
  │          │  │          │  │          │  │           │
  │ Next.js  │  │ LiveKit  │  │ WA + IG  │  │ ForteBank │
  │ Kanban   │  │ Deepgram │  │ webhooks │  │ Plans     │
  │ Leads    │  │ ElevenLab│  │ routing  │  │ Usage     │
  │ Users    │  │ LLM orch │  │          │  │           │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬──────┘
       │              │             │              │
       └──────────────┴─────────────┴──────────────┘
                              │
                 ┌────────────▼────────────┐
                 │    Message Bus (NATS)    │
                 │    Event-driven comms    │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │    Data Layer            │
                 │    MongoDB + Redis +     │
                 │    S3 + Vector DB        │
                 └─────────────────────────┘
```

### 12.2. Когда мигрировать

| Сигнал | Действие |
|--------|----------|
| >50 concurrent calls | Voice → Go + LiveKit |
| >1000 leads/org | CRM → отдельный сервис + PostgreSQL |
| >$5000/мес на VAPI | Собственный voice pipeline |
| Нужен казахский язык | Интеграция Gladia STT |

### 12.3. Почему Go для Voice Service

- **goroutine per call** — каждый звонок = горутина (~8KB RAM), тысячи одновременно
- **LiveKit** (open-source) — production-grade media server на Go, используется ElevenLabs
- **Latency** — Go компилируется в native code, нет GC pauses как в Java
- **Retell AI и VAPI** используют Go для voice infrastructure

---

## 13. Мониторинг и наблюдаемость

### 13.1. Ключевые метрики

| Категория | Метрика | Цель |
|-----------|---------|------|
| **Voice** | Call completion rate | >70% |
| **Voice** | Avg call duration | 2-4 мин |
| **Voice** | First response latency | <1.5 сек |
| **Voice** | Qualification accuracy | >80% |
| **CRM** | Lead-to-call time | <30 сек |
| **CRM** | Kanban board load time | <500ms |
| **System** | API response time (p95) | <200ms |
| **System** | Webhook processing time | <5 сек |
| **Business** | MRR | Растёт |
| **Business** | Churn rate | <5% |
| **Business** | Cost per minute | <$0.25 |

### 13.2. Стек мониторинга

- **Application**: Sentry (errors, performance tracing)
- **Logs**: Vercel Logs + Axiom (structured logging)
- **Queue**: BullMQ Dashboard (Bull Board)
- **Uptime**: BetterUptime / UptimeRobot
- **Business metrics**: Custom dashboard в Voxi (admin panel)

---

## 14. MVP Roadmap (в порядке разработки)

### Sprint 1 (Неделя 1-2): Foundation
- [ ] Next.js проект + shadcn/ui setup
- [ ] MongoDB models + connection
- [ ] Auth.js (email/password + Google OAuth)
- [ ] Базовая layout: sidebar, header, org settings
- [ ] RBAC middleware

### Sprint 2 (Неделя 3-4): CRM Core
- [ ] Kanban board (drag-and-drop с @dnd-kit)
- [ ] CRUD лидов (создание, редактирование, удаление)
- [ ] Pipeline management (создание колонок)
- [ ] Real-time обновления (Pusher)
- [ ] Фильтры и поиск лидов

### Sprint 3 (Неделя 5-6): Voice Engine
- [ ] VAPI интеграция (создание assistant)
- [ ] Telnyx SIP trunk настройка
- [ ] BullMQ + Redis setup
- [ ] Call initiation flow
- [ ] VAPI webhook → транскрипт → карточка
- [ ] AI-резюме звонков
- [ ] Автоматическое перемещение карточки

### Sprint 4 (Неделя 7-8): Channels
- [ ] WhatsApp Cloud API webhook
- [ ] WhatsApp chat в интерфейсе (read/send)
- [ ] Instagram DM webhook
- [ ] Website lead form API + widget
- [ ] Notification system

### Sprint 5 (Неделя 9-10): Bot Config & Knowledge
- [ ] UI настройки бота (промпт, голос, поведение)
- [ ] Upload PDF → vector store (RAG)
- [ ] Bot testing (test call из интерфейса)
- [ ] Call history + transcript viewer
- [ ] Recording playback

### Sprint 6 (Неделя 11-12): Billing & Polish
- [ ] ForteBank integration (plans, subscriptions)
- [ ] Usage tracking (минуты)
- [ ] Billing page UI
- [ ] Onboarding flow (wizard для новых клиентов)
- [ ] Error handling, logging, monitoring
- [ ] Performance optimization

---

## 15. Источники и ссылки

### Документация технологий
- [Next.js App Router](https://nextjs.org/docs/app)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [MongoDB Schema Design Patterns](https://www.mongodb.com/docs/manual/data-modeling/)
- [VAPI Documentation](https://docs.vapi.ai/)
- [Telnyx SIP + VAPI Integration](https://docs.vapi.ai/advanced/sip/telnyx)
- [WhatsApp Cloud API](https://developers.facebook.com/documentation/business-messaging/whatsapp/)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-platform/webhooks/)
- [ForteBank E-commerce API](https://docs.fortebank.com/en/)
- [Auth.js RBAC Guide](https://authjs.dev/guides/role-based-access-control)

### Best Practices (исследование)
- [VAPI Review 2026 — Coval](https://www.coval.dev/blog/vapi-review-2026-is-this-voice-ai-platform-right-for-your-project)
- [VAPI Optimization Guide](https://voiceaiwrapper.com/insights/vapi-voice-ai-optimization-performance-guide-voiceaiwrapper)
- [Voice AI + CRM Integration Guide — Leaping AI](https://leapingai.com/blog/voice-ai-integration-with-crm-the-complete-implementation-guide-for-enterprise-success)
- [AI Voice Agent Implementation Guide — Greetly AI](https://www.greetlyai.com/blog/ai-voice-agent-implementation-complete-step-by-step-guide-for-2025)
- [Next.js Multi-Tenant Architecture](https://nextjs.org/docs/app/guides/multi-tenant)
- [Multi-Tenant SaaS Roadmap — Ideadope](https://www.ideadope.com/roadmaps/how-to-build-multi-tenant-saas-2025)
- [Next.js 16 Architecture Blueprint — Suresh Kumar](https://medium.com/@sureshdotariya/next-js-16-architecture-blueprint-for-large-scale-applications-build-scalable-saas-multi-tenant-ab0efe9f2dad)
- [WhatsApp Webhook Architecture — Chat Architect](https://www.chatarchitect.com/news/building-a-scalable-webhook-architecture-for-custom-whatsapp-solutions)
- [CRM + WhatsApp Webhook Integration Guide](https://www.chatarchitect.com/news/crm-integration-with-whatsapp-api-and-webhook-logic-a-comprehensive-guide)
- [Instagram Messaging API Integration — Unipile](https://www.unipile.com/instagram-messaging-api/)
- [Kanban Board with WebSockets — Novu](https://novu.co/blog/building-a-beautiful-kanban-board-with-node-js-react-and-websockets/)

---

*Документ создан на основе исследования актуальных best practices (март 2026). Подлежит обновлению по мере разработки.*
