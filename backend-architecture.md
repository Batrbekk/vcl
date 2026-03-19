# VOXI Backend — Архитектура и план реализации

> Этот документ описывает архитектуру backend-части платформы VOXI. Написан на основе voxi-description.md и voxi-architecture.md с фокусом на прагматичность: что строить для демо завтра, как масштабировать послезавтра.

---

## 1. Executive Summary

**VOXI** — AI-платформа автоматизации продаж для B2B-компаний Казахстана. Ядро продукта: лиды приходят из WhatsApp / Instagram / сайта, AI-бот звонит им через казахстанский номер, квалифицирует и двигает карточку по Kanban-воронке. Менеджеры работают только с тёплыми лидами.

**Архитектурное решение: модульный монолит на Next.js.**

Почему:
- Одна кодовая база (TypeScript) — frontend + backend + webhooks + workers
- Демо можно показать через 1-2 спринта, а не через 3 месяца
- Чёткая модульная структура позволяет выделить любой модуль в микросервис позже
- Главная бизнес-логика (голосовые звонки) делегирована VAPI — backend оркестрирует, а не обрабатывает аудио

**Ключевые технологии:**
- Runtime: Node.js + TypeScript
- Framework: Next.js 16 (App Router) — SSR, API routes, middleware
- Database: MongoDB Atlas (гибкая схема для CRM)
- Queue: BullMQ + Redis (Upstash) — асинхронные задачи, retry, scheduling
- Voice AI: VAPI.ai (STT → LLM → TTS оркестрация)
- Telephony: Telnyx (KZ номера, SIP trunk)
- Payments: ForteBank E-commerce API (подписки в KZT)
- Real-time: Pusher (WebSocket для Kanban)
- Storage: Cloudflare R2 (записи звонков, PDF базы знаний)

---

## 2. Обзор системы

### 2.1. Высокоуровневая диаграмма

```
                    ┌─────────────────────────────────────────────────┐
                    │              ВНЕШНИЕ ИСТОЧНИКИ                   │
                    │                                                  │
                    │  WhatsApp    Instagram    Website     Телефон    │
                    │  Cloud API   DM API      Forms       (future)   │
                    └──────┬──────────┬──────────┬───────────┬────────┘
                           │          │          │           │
                    ═══════╪══════════╪══════════╪═══════════╪════════
                           │          │          │           │
                    ┌──────▼──────────▼──────────▼───────────▼────────┐
                    │           WEBHOOK GATEWAY (API Routes)           │
                    │   Verify signature → Parse → Enqueue → 200 OK   │
                    └────────────────────────┬────────────────────────┘
                                             │
                    ┌────────────────────────▼────────────────────────┐
                    │             BullMQ JOB QUEUES                    │
                    │                                                  │
                    │  leads │ calls │ vapi-events │ whatsapp │ billing│
                    └───┬────────┬────────┬────────────┬─────────┬───┘
                        │        │        │            │         │
               ┌────────▼──┐ ┌──▼─────┐ ┌▼─────────┐ │    ┌────▼─────┐
               │ CRM       │ │ Voice  │ │ Message  │ │    │ Billing  │
               │ Module    │ │ Module │ │ Module   │ │    │ Module   │
               │           │ │        │ │          │ │    │          │
               │ Leads     │ │ VAPI   │ │ WhatsApp │ │    │ ForteBank│
               │ Pipeline  │ │ Telnyx │ │ Instagram│ │    │ Plans    │
               │ Kanban    │ │ Calls  │ │ Chat     │ │    │ Usage    │
               └─────┬─────┘ └───┬────┘ └────┬─────┘ │    └────┬─────┘
                     │            │           │       │         │
                     └────────────┴───────────┴───────┴─────────┘
                                          │
                    ┌─────────────────────▼──────────────────────┐
                    │              DATA LAYER                      │
                    │                                              │
                    │  MongoDB Atlas    Redis (Upstash)    R2/S3   │
                    │  (основные данные) (queue, cache)   (файлы)  │
                    └─────────────────────────────────────────────┘
```

### 2.2. Принцип работы

1. **Webhook входит** — API route валидирует подпись, парсит payload, кладёт job в BullMQ, возвращает 200 OK за <100ms
2. **Worker обрабатывает** — асинхронно, с retry и backoff. Создаёт/обновляет лида, инициирует звонок, сохраняет сообщение
3. **VAPI звонит** — получает конфигурацию ассистента, звонит через Telnyx SIP, ведёт диалог (STT→LLM→TTS), по завершении шлёт webhook с транскриптом
4. **Карточка двигается** — worker обрабатывает end-of-call-report, извлекает квалификацию, перемещает лида в нужную колонку
5. **Менеджер видит** — Pusher доставляет real-time обновление на Kanban доску

---

## 3. Архитектурные решения и обоснования

### 3.1. Модульный монолит vs Микросервисы

| Критерий | Модульный монолит | Микросервисы |
|----------|-------------------|--------------|
| Time-to-demo | 1-2 недели | 4-6 недель |
| Deployment complexity | 1 деплой (Vercel + Railway) | 4-6 сервисов, K8s/Docker Compose |
| Team size required | 1-2 разработчика | 3-5 разработчиков |
| Inter-service communication | Прямые вызовы функций | HTTP/gRPC/message bus |
| Debugging | Единый стек трейс | Distributed tracing |
| Scalability ceiling | ~100 concurrent calls | ~10 000+ concurrent calls |

**Решение: модульный монолит на Фазе 1.** Голосовой движок (VAPI) уже вынесен за пределы нашего backend — это самая ресурсоёмкая часть. Наш backend — это оркестратор, CRM и биллинг. Для этих задач монолит с чёткими модулями — оптимум.

**Переход к микросервисам (Фаза 2)** — когда появятся сигналы:
- >50 параллельных звонков → Voice Service на Go + LiveKit
- >$5000/мес на VAPI → собственный voice pipeline
- >1000 лидов на организацию → CRM на PostgreSQL

### 3.2. Почему Next.js, а не отдельный backend (Express/Fastify/NestJS)

| Фактор | Next.js API Routes | Отдельный backend |
|--------|-------------------|-------------------|
| Количество проектов | 1 (монорепо) | 2 (frontend + backend) |
| Shared types | Автоматически (один TypeScript) | Нужен shared package |
| Auth | Встроенный Auth.js + middleware | Отдельная настройка |
| Deployment | Vercel (zero-config) | Нужен CI/CD pipeline |
| Webhook endpoints | API Routes | Express routes |
| SSR для dashboard | Из коробки | Отдельный SPA |

**Важно:** Next.js API Routes — это полноценный backend. Route handlers поддерживают все HTTP методы, middleware, streaming. Для MVP это оптимально. При масштабировании тяжёлые модули (voice, billing) выносятся в отдельные сервисы.

### 3.3. API: REST vs GraphQL vs gRPC

**Решение: REST (JSON) для всех внешних API + internal function calls внутри монолита.**

- REST — универсален для webhook провайдеров (VAPI, Meta, ForteBank все шлют JSON)
- GraphQL избыточен для MVP — Kanban доска не нуждается в гибких запросах, структура данных стабильна
- gRPC нужен для inter-service communication — но у нас монолит, поэтому пока не нужен
- В будущем при выделении Voice Service → gRPC между CRM и Voice для низкой latency

### 3.4. Database: MongoDB vs PostgreSQL

| Критерий | MongoDB | PostgreSQL |
|----------|---------|------------|
| CRM с кастомными полями | Нативно (Schema.Types.Mixed) | JSON column (менее удобно) |
| Гибкость схемы | Высокая — важно для MVP, когда схема меняется каждый день | Низкая без миграций |
| Full-text search (русский) | Atlas Search (из коробки) | pg_trgm + ts_vector (настройка) |
| Бесплатный tier | M0 (512MB) | Neon/Supabase (аналогично) |
| Kanban queries | Отлично (nested documents для columns) | Нужны JOIN-ы |
| Транзакции | С 4.0+ (multi-document) | ACID из коробки |
| Биллинг/финансы | Достаточно для MVP | Лучше для сложной аналитики |

**Решение: MongoDB Atlas на MVP.** Главный аргумент — CRM-данные по своей природе полуструктурированны (кастомные поля, nested objects, varying schema per industry). При необходимости строгой финансовой аналитики — отдельный PostgreSQL для billing module на Фазе 2.

---

## 4. Модульная структура backend

### 4.1. Карта модулей

```
backend/
├── core/           # Общая инфраструктура
│   ├── auth        # Auth.js, JWT, RBAC, session
│   ├── db          # MongoDB connection, models, tenant isolation
│   ├── queue       # BullMQ setup, queue definitions
│   ├── realtime    # Pusher integration
│   ├── storage     # Cloudflare R2 (S3-compatible)
│   ├── crypto      # AES-256-GCM encryption for secrets
│   └── validators  # Zod schemas (shared validation)
│
├── modules/
│   ├── crm/        # CRM + Kanban (ядро продукта)
│   │   ├── leads/           # CRUD лидов, фильтры, поиск
│   │   ├── pipeline/        # Воронки, колонки, drag-and-drop
│   │   ├── qualification/   # AI-квалификация после звонка
│   │   └── assignment/      # Назначение менеджеров
│   │
│   ├── voice/      # Голосовой движок
│   │   ├── vapi-service/    # VAPI SDK wrapper (create assistant, initiate call)
│   │   ├── telnyx-service/  # Telnyx API (phone numbers, SIP)
│   │   ├── call-manager/    # Оркестрация звонков, retry logic
│   │   ├── transcript/      # Сохранение и обработка транскриптов
│   │   └── ai-summary/     # LLM-анализ звонков (summary, sentiment, qualification)
│   │
│   ├── channels/   # Каналы коммуникации
│   │   ├── whatsapp/        # WhatsApp Cloud API (webhook, send, receive)
│   │   ├── instagram/       # Instagram DM API
│   │   ├── lead-form/       # Public API для форм на сайтах клиентов
│   │   └── messaging/       # Unified messaging layer (абстракция над каналами)
│   │
│   ├── bot/        # Настройки AI-бота
│   │   ├── config/          # Bot configuration CRUD
│   │   ├── knowledge/       # Knowledge base (PDF upload, RAG)
│   │   ├── prompts/         # System prompt builder
│   │   └── testing/         # Test call functionality
│   │
│   ├── billing/    # Биллинг и подписки
│   │   ├── plans/           # Тарифные планы (starter/business/enterprise)
│   │   ├── subscriptions/   # ForteBank Subscriptions API
│   │   ├── usage/           # Трекинг минут, лимиты
│   │   └── invoices/        # История платежей
│   │
│   ├── team/       # Управление командой
│   │   ├── members/         # CRUD пользователей, приглашения
│   │   └── roles/           # RBAC (owner, admin, manager)
│   │
│   └── analytics/  # Аналитика (MVP-версия)
│       ├── dashboard/       # Метрики для главного экрана
│       ├── call-stats/      # Статистика звонков
│       └── lead-funnel/     # Конверсия по воронке
│
└── workers/        # BullMQ workers (отдельный процесс)
    ├── lead-worker          # Обработка новых лидов из всех каналов
    ├── call-worker          # Инициация и обработка звонков
    ├── vapi-event-worker    # Обработка webhook-ов от VAPI
    ├── message-worker       # Обработка WA/IG сообщений
    ├── billing-worker       # Cron-задачи биллинга
    ├── retry-worker         # Повторные попытки звонков
    └── notification-worker  # Push/email уведомления менеджерам
```

### 4.2. Зависимости между модулями

```
channels ──────┐
               ├──→ crm (создаёт/обновляет лидов)
lead-form ─────┘       │
                       ├──→ voice (инициирует звонок для нового лида)
                       │       │
                       │       └──→ crm (обновляет квалификацию, двигает карточку)
                       │
                       └──→ billing (проверяет лимит минут перед звонком)
                               │
                               └──→ team (уведомляет менеджеров)

bot ──→ voice (конфигурация assistant для VAPI)
analytics ←── crm + voice + billing (read-only агрегация)
```

**Правило:** модули общаются через определённые interface-контракты (TypeScript interfaces), а не напрямую импортируют внутренности друг друга. Это позволит выделить модуль в микросервис заменив import на HTTP/gRPC вызов.

---

## 5. Tech Stack — детали и обоснования

### 5.1. Полный стек MVP

| Слой | Технология | Версия | Обоснование |
|------|-----------|--------|-------------|
| **Language** | TypeScript | 5.x | Один язык на всё, строгая типизация |
| **Runtime** | Node.js | 22 LTS | Async I/O идеален для webhook/API сервер |
| **Framework** | Next.js | 16 (App Router) | SSR + API + middleware, Vercel deployment |
| **UI** | React 19 + Tailwind CSS + shadcn/ui | — | Быстрая разработка dashboard |
| **Auth** | Auth.js (NextAuth v5) | 5.x | JWT sessions, RBAC, OAuth |
| **Database** | MongoDB Atlas | 8.x | Гибкая CRM-схема, Atlas Search |
| **ODM** | Mongoose | 9.x | Схемы, валидация, middleware, типизация |
| **Queue** | BullMQ + Redis | 5.x | Job scheduling, retry, delayed jobs, cron |
| **Redis** | Upstash Redis | — | Serverless, pay-per-request, global |
| **Real-time** | Pusher | — | WebSocket managed service, бесплатный tier |
| **Voice AI** | VAPI.ai | — | STT→LLM→TTS оркестрация, barge-in, webhooks |
| **Telephony** | Telnyx | — | KZ номера (+7), SIP trunk, REST API |
| **Payments** | ForteBank E-commerce | — | Subscriptions API, KZT, авторекуррент |
| **Storage** | Cloudflare R2 | — | S3-compatible, 0 egress cost |
| **Validation** | Zod | 3.x | Runtime + compile-time type safety |
| **HTTP client** | ky / native fetch | — | Lightweight, TypeScript-first |
| **Monitoring** | Sentry | — | Errors + performance tracing |
| **Logs** | Axiom (через Vercel) | — | Structured logging |
| **Deploy (app)** | Vercel | — | Zero-config Next.js hosting |
| **Deploy (workers)** | Railway | — | Long-running Node.js processes |

### 5.2. Почему не X?

| Отвергнутая альтернатива | Причина отказа |
|--------------------------|----------------|
| **NestJS** | Overkill для MVP, больше boilerplate, дольше до демо |
| **Fastify** | Потребовал бы отдельного frontend (2 проекта) |
| **PostgreSQL** | CRM-данные лучше ложатся в document model; для финансов добавим позже |
| **Kafka** | Overkill для <100 events/sec; BullMQ достаточно для MVP |
| **GraphQL** | Overhead на schema definition; REST проще и быстрее для стабильных endpoints |
| **Firebase** | Vendor lock-in, нет нативных KZ-платежей, ограниченный control |
| **Supabase** | Хороший вариант, но MongoDB лучше для CRM с кастомными полями |
| **Socket.io (self-hosted)** | Нужен отдельный сервер; Pusher проще на MVP |

---

## 6. Database Schema — ключевые сущности

### 6.1. ER-диаграмма (текстовая)

```
Organization (Tenant)
  │
  ├── 1:N ──→ User (members: owner, admin, manager)
  │
  ├── 1:N ──→ Pipeline (воронки)
  │               │
  │               └── embedded ──→ Column[] (колонки Kanban)
  │
  ├── 1:N ──→ Lead (лиды)
  │               │
  │               ├── N:1 ──→ Pipeline
  │               ├── N:1 ──→ User (assignedTo)
  │               ├── 1:N ──→ Call (звонки)
  │               └── 1:N ──→ Message (WA/IG переписка)
  │
  ├── 1:1 ──→ BotConfig (настройки AI-бота)
  │               │
  │               └── embedded ──→ KnowledgeFile[]
  │
  ├── 1:1 ──→ Subscription (биллинг)
  │               │
  │               └── embedded ──→ Payment[] (история платежей)
  │
  └── embedded ──→ Integrations (WhatsApp, Instagram, Telnyx credentials)
```

### 6.2. Ключевые модели

**Organization** — tenant root. Все данные привязаны к orgId. Хранит plan, integrations, working hours, members.

**Lead** — центральная сущность CRM:
- Контакт: name, phone (+7XXXXXXXXXX), email
- Позиция: pipelineId, columnId (в какой колонке Kanban)
- Источник: channel (whatsapp/instagram/website/manual), UTM, original message
- Квалификация: score (0-100), budget, need, timeline (заполняется AI после звонка)
- Retry state: callAttempts, maxCallAttempts, nextFollowUpAt
- Custom fields: Schema.Types.Mixed (для разных индустрий)

**Call** — запись о звонке:
- VAPI привязка: vapiCallId, vapiAssistantId
- Телефония: direction, from, to, status (queued → ringing → in-progress → completed/failed)
- Контент: transcript[], recordingUrl, summary (AI), sentiment
- Квалификация: extractedData (budget, need, objections, nextAction)
- Стоимость: cost.totalUsd

**BotConfig** — один на организацию:
- Идентичность: name, greeting
- Голос: provider (elevenlabs/cartesia), voiceId, speed, language
- LLM: provider (openai/anthropic), model, temperature, maxTokens
- Промпт: systemPrompt, qualificationQuestions
- Поведение: maxCallDuration, retryAttempts, retryIntervals[], callOnlyWorkingHours
- Routing rules: qualified → columnId + notify[], notInterested → columnId, etc.
- Knowledge base: files[] (fileId, fileName, vectorStoreId)

**Message** — WhatsApp/Instagram переписка:
- channel, direction (inbound/outbound), content (text/image/document)
- externalId (wamid для дедупликации)
- sentBy (null = bot/system)

**Subscription** — биллинг:
- ForteBank IDs: fortePlanId, forteSubscriptionId, forteCustomerId
- Plan: starter/business/enterprise, priceKzt, billingCycle
- Usage: minutesIncluded, minutesUsed, overageRateKzt
- Status: active/past_due/cancelled/trialing

### 6.3. Индексы (критические для производительности)

```
Lead:
  { orgId: 1, columnId: 1, updatedAt: -1 }   — Kanban board query
  { orgId: 1, phone: 1 }  unique              — дедупликация по номеру
  { orgId: 1, status: 1 }                     — фильтр по статусу
  { orgId: 1, assignedTo: 1 }                 — лиды менеджера
  { nextFollowUpAt: 1 }  sparse               — scheduler (retry calls)

Call:
  { orgId: 1, createdAt: -1 }                 — журнал звонков
  { leadId: 1, createdAt: -1 }                — звонки лида
  { vapiCallId: 1 }  unique                   — поиск по VAPI callback
  { status: 1 }                               — мониторинг активных

Message:
  { orgId: 1, leadId: 1, createdAt: -1 }      — чат с лидом
  { externalId: 1 }  sparse                   — дедупликация webhook-ов
```

### 6.4. Tenant Isolation (мультитенантность)

```typescript
// Каждый запрос к БД ОБЯЗАТЕЛЬНО фильтруется по orgId
// Реализация через Mongoose middleware:

function addTenantPlugin(schema: Schema) {
  // pre-find: автоматически добавляет orgId в каждый find/findOne
  schema.pre(/^find/, function () {
    const orgId = this.getOptions().orgId;
    if (orgId) {
      this.where({ orgId });
    }
  });
}

// Использование:
const leads = await Lead.find({ status: 'active' }).setOptions({ orgId });
```

Это критически важно для безопасности — один клиент не должен видеть данные другого.

---

## 7. API Architecture

### 7.1. Webhook Pipeline (Ingestion Layer)

Все внешние события обрабатываются по единому паттерну:

```
HTTP POST → Validate Signature → Parse payload → Enqueue BullMQ job → 200 OK
                                                         │
                                                  Worker обрабатывает
                                                  асинхронно (retry, backoff)
```

**Почему асинхронно:** webhook endpoint ОБЯЗАН вернуть 200 за 5-30 секунд (зависит от провайдера). Если не успеет — провайдер пошлёт retry, и мы получим дубликат. Поэтому тяжёлая логика — только в worker.

### 7.2. Полная таблица API endpoints

#### Webhooks (public, без JWT, подпись/секрет)

| Метод | Путь | Источник | Верификация |
|-------|------|----------|-------------|
| POST | `/api/webhooks/whatsapp` | Meta Cloud API | HMAC-SHA256 (`x-hub-signature-256`) |
| GET | `/api/webhooks/whatsapp` | Meta verification | Challenge-response (`hub.verify_token`) |
| POST | `/api/webhooks/instagram` | Meta Graph API | HMAC-SHA256 |
| POST | `/api/webhooks/vapi` | VAPI.ai | Shared secret (`x-vapi-secret`) |
| POST | `/api/webhooks/fortebank` | ForteBank | Digital signature |
| POST | `/api/webhooks/lead-form` | Сайты клиентов | API Key (`x-api-key`) |

#### CRM (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/leads` | Список лидов (pagination, filters, search) | manager+ |
| POST | `/api/leads` | Создать лида вручную | manager+ |
| GET | `/api/leads/:id` | Карточка лида (с историей звонков и сообщений) | manager+ |
| PATCH | `/api/leads/:id` | Обновить лида | manager+ |
| PATCH | `/api/leads/:id/move` | Переместить в другую колонку (drag-and-drop) | manager+ |
| DELETE | `/api/leads/:id` | Архивировать лида | admin+ |
| GET | `/api/pipeline` | Получить воронку с колонками | manager+ |
| PUT | `/api/pipeline` | Обновить структуру воронки | admin+ |

#### Voice (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/calls` | Журнал звонков (pagination, filters) | manager+ |
| POST | `/api/calls/initiate` | Инициировать звонок лиду вручную | manager+ |
| GET | `/api/calls/:id` | Детали звонка | manager+ |
| GET | `/api/calls/:id/transcript` | Полный транскрипт | manager+ |
| GET | `/api/calls/:id/recording` | URL записи | manager+ |

#### Bot Config (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/bot/config` | Текущие настройки бота | admin+ |
| PUT | `/api/bot/config` | Обновить настройки (промпт, голос, поведение) | admin+ |
| POST | `/api/bot/knowledge` | Загрузить файл в базу знаний (multipart) | admin+ |
| DELETE | `/api/bot/knowledge/:fileId` | Удалить файл из базы знаний | admin+ |
| POST | `/api/bot/test-call` | Тестовый звонок на свой номер | admin+ |

#### Messaging (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/messages/:leadId` | История переписки с лидом | manager+ |
| POST | `/api/messages/:leadId/send` | Отправить сообщение (WA/IG) | manager+ |

#### Billing (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/billing` | Текущая подписка + usage | owner+ |
| POST | `/api/billing/subscribe` | Оформить/сменить подписку | owner |
| POST | `/api/billing/change-plan` | Сменить тариф | owner |
| GET | `/api/billing/invoices` | История платежей | owner+ |

#### Team (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/team` | Список членов команды | admin+ |
| POST | `/api/team/invite` | Пригласить менеджера (email) | admin+ |
| PATCH | `/api/team/:userId` | Обновить роль / деактивировать | admin+ |

#### Analytics (protected, JWT)

| Метод | Путь | Описание | Роль |
|-------|------|----------|------|
| GET | `/api/analytics/dashboard` | Сводные метрики (звонки, лиды, конверсия) | manager+ |
| GET | `/api/analytics/calls` | Статистика звонков за период | admin+ |
| GET | `/api/analytics/funnel` | Конверсия по воронке | admin+ |

### 7.3. Middleware Chain

```
Request
  │
  ├── 1. Next.js Middleware (middleware.ts)
  │     ├── Public paths → pass through
  │     ├── Webhooks → pass through (own auth)
  │     └── Protected → verify JWT → inject x-org-id, x-user-id, x-user-role headers
  │
  ├── 2. Route Handler
  │     ├── Parse body (JSON / multipart)
  │     ├── Validate with Zod schema
  │     ├── Check RBAC (require role)
  │     └── Execute business logic (call module service)
  │
  └── Response (JSON)
```

### 7.4. Response Format

Все API endpoints возвращают единообразный формат:

```typescript
// Success
{ "data": { ... }, "meta": { "page": 1, "total": 150 } }

// Error
{ "error": { "code": "LEAD_NOT_FOUND", "message": "Лид не найден" } }
```

---

## 8. Integration Points

### 8.1. VAPI.ai — Voice AI Engine

**Роль:** Полный voice pipeline (STT → LLM → TTS), barge-in, backchanneling, recording.

**Интеграция:**
1. **Backend → VAPI:** REST API
   - `POST /assistant` — создать/обновить assistant (при изменении BotConfig)
   - `POST /call` — инициировать исходящий звонок
   - `GET /call/:id` — проверить статус

2. **VAPI → Backend:** Webhooks
   - `status-update` — звонок начался / ringing / answered
   - `end-of-call-report` — звонок завершён + транскрипт + summary + recording URL
   - `transcript` — real-time транскрипт (для live dashboard)
   - `function-call` — VAPI просит бэкенд выполнить action (например, проверить расписание)

**Ключевой flow инициации звонка:**

```
1. Новый лид создан (webhook от WA/IG/form)
2. BullMQ job: check working hours → check minutes limit → check max attempts
3. Если всё ОК → vapi.calls.create({ assistantId, customer: { number: lead.phone } })
4. VAPI звонит через Telnyx SIP trunk
5. Звонок завершён → VAPI POST /api/webhooks/vapi с end-of-call-report
6. Worker: save transcript → AI qualification → move card → notify manager
7. Если no-answer → schedule retry (delayed BullMQ job)
```

### 8.2. Telnyx — Телефония

**Роль:** Казахстанские номера (+7), SIP trunk для VAPI.

**Интеграция:** Telnyx подключается к VAPI как SIP trunk. Backend напрямую с Telnyx не общается для голосовых звонков — только для:
- Provisioning номеров (API)
- Мониторинг баланса
- Получение CDR (Call Detail Records) для сверки с VAPI billing

### 8.3. WhatsApp Cloud API — Мессенджер

**Роль:** Приём заявок (входящие сообщения) + отправка сообщений менеджерами.

**Интеграция:**
- **Inbound:** Meta POST → `/api/webhooks/whatsapp` → BullMQ → create/update lead + save message + auto-initiate call
- **Outbound:** Manager sends message → API call to `graph.facebook.com/v21.0/{phoneNumberId}/messages`
- **Templates:** Для first-contact (24-hour window rule) нужны approved WhatsApp Templates

### 8.4. Instagram DM API — Мессенджер

**Роль:** Приём DM (входящие) + ответы менеджерам.

**Интеграция:** Аналогична WhatsApp (тот же Meta Graph API). Ключевое ограничение: Instagram не позволяет инициировать переписку — только отвечать на входящие DM.

### 8.5. ForteBank — Платежи

**Роль:** Подписки в KZT с автосписанием.

**Интеграция:**
1. Backend создаёт Plan в ForteBank (starter/business/enterprise)
2. Клиент видит ForteBank Payment Widget (PCI DSS compliant) → вводит карту
3. ForteBank списывает → webhook → активируем подписку
4. Каждый месяц ForteBank автосписывает → webhook → обновляем статус
5. Если fail → ForteBank retry → если финальный fail → downgrade plan

### 8.6. OpenAI — AI-анализ

**Роль:** Post-call analysis (summary, sentiment, qualification extraction).

**Интеграция:** После завершения звонка worker вызывает OpenAI API с транскриптом → получает структурированный JSON с квалификацией. Это НЕ real-time — выполняется в background worker.

```typescript
// Пример: извлечение квалификации из транскрипта
const qualification = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: 'Извлеки из транскрипта: budget, need, timeline, outcome, sentiment. JSON.' },
    { role: 'user', content: transcriptText },
  ],
});
```

---

## 9. BullMQ — Очереди задач

### 9.1. Определение очередей

| Очередь | Назначение | Concurrency | Retry Strategy |
|---------|-----------|-------------|----------------|
| `leads` | Создание лидов из webhooks | 10 | 3x exponential (1s, 2s, 4s) |
| `calls` | Инициация звонков через VAPI | 5 | 3x fixed 30s |
| `call-retry` | Повторные попытки звонков (delayed) | 3 | 3x exponential |
| `vapi-events` | Обработка webhook от VAPI | 10 | 3x exponential |
| `whatsapp` | Обработка WA сообщений | 10 | 3x exponential |
| `instagram` | Обработка IG сообщений | 5 | 3x exponential |
| `billing` | Cron-задачи (usage check, alerts) | 1 | 5x exponential |
| `notifications` | Push/email уведомления | 10 | 3x fixed 5s |

### 9.2. Ключевые паттерны

**Idempotency:** Каждый job имеет уникальный `jobId` для дедупликации. Если webhook пришёл дважды — второй job не создастся.

```typescript
await callQueue.add('initiate-call', { leadId, attempt: 1 }, {
  jobId: `call-${leadId}-attempt-1`,  // дедупликация
});
```

**Delayed jobs:** Повторный звонок через 30 мин → `delay: 30 * 60 * 1000`.

**Repeatable jobs (cron):** Ежедневная проверка usage → `repeat: { pattern: '0 0 * * *' }`.

**Job retention:** Completed — 24 часа, Failed — 7 дней.

### 9.3. Deployment: Workers отдельным процессом

Workers запускаются на Railway (не на Vercel), потому что:
- Vercel Functions имеют timeout (10-60 сек) — не подходит для long-running workers
- BullMQ workers должны быть persistent — слушать Redis непрерывно
- Railway поддерживает persistent Node.js processes с auto-restart

```
Vercel: Next.js app (pages, API routes, webhooks)
Railway: BullMQ workers (Node.js process, always-on)
           └── uses same MONGODB_URI and REDIS_URL
```

---

## 10. Authentication & Authorization

### 10.1. Auth Flow

```
                    ┌──────────────┐
                    │   Login      │
                    │   /signup    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Auth.js    │
                    │ (NextAuth v5)│
                    │              │
                    │ Credentials  │  ← email + password (bcrypt)
                    │ + Google     │  ← OAuth (optional)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   JWT Token  │
                    │  (httpOnly   │
                    │   cookie)    │
                    │              │
                    │ Payload:     │
                    │  sub: userId │
                    │  orgId       │
                    │  role        │
                    │  name        │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Middleware   │
                    │  (every req) │
                    │              │
                    │ Verify JWT → │
                    │ Inject:      │
                    │  x-org-id    │
                    │  x-user-id   │
                    │  x-user-role │
                    └──────────────┘
```

### 10.2. RBAC (Role-Based Access Control)

| Роль | Описание | Возможности |
|------|----------|-------------|
| **owner** | Владелец организации (создатель аккаунта) | Всё + billing + delete org |
| **admin** | Администратор | Всё кроме billing |
| **manager** | Менеджер по продажам | Видит своих лидов, чат, звонки. Не настраивает бота. |

```typescript
// Проверка роли в API route
function requireRole(allowedRoles: string[]) {
  return (req: Request) => {
    const role = req.headers.get('x-user-role');
    if (!allowedRoles.includes(role)) {
      return new Response('Forbidden', { status: 403 });
    }
  };
}

// Использование:
export async function PUT(req: Request) {
  requireRole(['owner', 'admin'])(req);
  // ... business logic
}
```

### 10.3. Шифрование секретов

Credentials интеграций (WhatsApp access token, Instagram token) хранятся в MongoDB зашифрованными AES-256-GCM. Ключ шифрования — в переменной окружения `ENCRYPTION_KEY` (32 bytes hex). Расшифровка только в runtime при обращении к API провайдера.

---

## 11. Real-time Communication

### 11.1. Pusher (MVP)

**Почему Pusher, а не Socket.io:**
- Next.js App Router не имеет нативной поддержки WebSocket
- Pusher — managed service, бесплатный tier 200 concurrent connections
- Подключение за 30 минут, а не за день

**Events:**

| Event | Канал | Данные | Триггер |
|-------|-------|--------|---------|
| `lead-created` | `org-{orgId}` | leadId, name, source | Новый лид из любого канала |
| `lead-moved` | `org-{orgId}` | leadId, fromColumn, toColumn | Перемещение карточки |
| `call-started` | `org-{orgId}` | callId, leadId | Звонок начался |
| `call-completed` | `org-{orgId}` | callId, summary, outcome | Звонок завершён |
| `new-message` | `org-{orgId}` | leadId, channel, preview | Входящее WA/IG сообщение |
| `usage-alert` | `org-{orgId}` | minutesUsed, minutesLimit | 80% лимита минут |

**Client-side:**
```typescript
// React hook подписывается на канал организации
const channel = pusher.subscribe(`org-${orgId}`);
channel.bind('lead-moved', () => queryClient.invalidateQueries(['leads']));
channel.bind('call-completed', (data) => toast.success(`Звонок: ${data.summary}`));
```

### 11.2. Миграция на Socket.io (Фаза 2)

При >200 concurrent connections или необходимости двусторонней связи — мигрируем на Socket.io сервер на Railway. Pusher-like API абстракция в `core/realtime` позволит сменить transport без изменения бизнес-логики.

---

## 12. Deployment Architecture

### 12.1. Production Environment

```
┌──────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                   │
│                                                                   │
│  ┌──────────────────┐          ┌────────────────────────┐        │
│  │    Vercel         │          │    Railway              │        │
│  │                   │          │                         │        │
│  │  Next.js App      │          │  BullMQ Workers         │        │
│  │  ├── SSR Pages    │   Redis  │  ├── lead-worker        │        │
│  │  ├── API Routes ──┼────────→ │  ├── call-worker        │        │
│  │  ├── Webhooks     │          │  ├── vapi-event-worker  │        │
│  │  └── Static       │          │  ├── message-worker     │        │
│  │                   │          │  ├── billing-worker     │        │
│  │  Auto-scaling     │          │  └── notification-worker│        │
│  │  Edge CDN         │          │                         │        │
│  └────────┬──────────┘          └────────────┬────────────┘        │
│           │                                  │                     │
│           └──────────────┬───────────────────┘                     │
│                          │                                         │
│  ┌───────────────────────▼───────────────────────────┐            │
│  │                   Data Tier                         │            │
│  │                                                     │            │
│  │  MongoDB Atlas (M10)    Upstash Redis    Cloudflare R2         │
│  │  ├── Organizations      ├── BullMQ jobs  ├── Call recordings   │
│  │  ├── Leads              ├── Session cache├── PDF knowledge     │
│  │  ├── Calls              └── Rate limits  └── Avatars          │
│  │  ├── Messages                                                  │
│  │  ├── Users                                                     │
│  │  └── Subscriptions                                             │
│  └─────────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌───────────────────────────────────────────────────┐            │
│  │                 External Services                    │            │
│  │                                                     │            │
│  │  VAPI.ai          Telnyx         ForteBank          │            │
│  │  (Voice AI)       (KZ phones)    (KZT payments)     │            │
│  │                                                     │            │
│  │  Meta Cloud API   Pusher         Sentry             │            │
│  │  (WA + IG)        (WebSocket)    (Monitoring)       │            │
│  └─────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### 12.2. Environment Variables

```bash
# ── Database ──
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...

# ── Auth ──
NEXTAUTH_SECRET=<random 32+ chars>
NEXTAUTH_URL=https://app.voxi.kz

# ── Encryption ──
ENCRYPTION_KEY=<64 hex chars (32 bytes)>

# ── VAPI ──
VAPI_API_KEY=...
VAPI_WEBHOOK_SECRET=...

# ── Telnyx ──
TELNYX_API_KEY=...
TELNYX_CONNECTION_ID=...
TELNYX_PHONE_NUMBER=+77...

# ── WhatsApp (Meta) ──
WA_PHONE_NUMBER_ID=...
WA_ACCESS_TOKEN=...
WA_VERIFY_TOKEN=...
WA_APP_SECRET=...

# ── Instagram ──
IG_PAGE_ID=...
IG_ACCESS_TOKEN=...

# ── ForteBank ──
FORTE_MERCHANT_ID=...
FORTE_API_KEY=...
FORTE_WEBHOOK_SECRET=...

# ── Pusher ──
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# ── Storage (Cloudflare R2) ──
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=voxi-files

# ── AI ──
OPENAI_API_KEY=...

# ── Monitoring ──
SENTRY_DSN=...

# ── App ──
APP_URL=https://app.voxi.kz
```

### 12.3. CI/CD Pipeline

```
main branch push
       │
       ├──→ Vercel: auto-deploy Next.js app (zero-config)
       │
       └──→ Railway: auto-deploy workers (Dockerfile or Nixpack)
             └── healthcheck: workers log "ready" + Bull Board dashboard
```

### 12.4. Стоимость инфраструктуры (MVP, оценка)

| Сервис | Tier | Стоимость/мес |
|--------|------|---------------|
| Vercel | Pro | $20 |
| Railway | Starter | $5 |
| MongoDB Atlas | M10 | $57 |
| Upstash Redis | Pay-as-you-go | ~$5 |
| Cloudflare R2 | Free tier (10GB) | $0 |
| Pusher | Free tier (200 conn) | $0 |
| Sentry | Developer | $0 |
| VAPI | Pay-per-minute | Variable (~$0.15/min) |
| Telnyx | Pay-per-minute | Variable (~$0.01/min) |
| **Итого (infra)** | | **~$87/мес + voice costs** |

---

## 13. Project Structure (полная)

```
voxi/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/                       # Public auth pages
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/                  # Protected dashboard
│   │   │   ├── layout.tsx                # Sidebar + header + auth guard
│   │   │   ├── page.tsx                  # Dashboard home (analytics overview)
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx              # Kanban board
│   │   │   │   └── [id]/page.tsx         # Lead detail (card + calls + chat)
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx              # Call log (table)
│   │   │   │   └── [id]/page.tsx         # Call detail (transcript + recording)
│   │   │   ├── bot/page.tsx              # Bot config (prompt, voice, behavior)
│   │   │   ├── knowledge/page.tsx        # Knowledge base (file upload)
│   │   │   ├── integrations/page.tsx     # Channel connections (WA, IG, website)
│   │   │   ├── billing/page.tsx          # Subscription + usage
│   │   │   ├── team/page.tsx             # Team management
│   │   │   └── settings/page.tsx         # Organization settings
│   │   │
│   │   ├── api/                          # Route Handlers (REST API)
│   │   │   ├── webhooks/
│   │   │   │   ├── whatsapp/route.ts
│   │   │   │   ├── instagram/route.ts
│   │   │   │   ├── vapi/route.ts
│   │   │   │   ├── fortebank/route.ts
│   │   │   │   └── lead-form/route.ts
│   │   │   ├── leads/
│   │   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET, PATCH, DELETE
│   │   │   │       └── move/route.ts     # PATCH (move to column)
│   │   │   ├── calls/
│   │   │   │   ├── route.ts              # GET (list)
│   │   │   │   ├── initiate/route.ts     # POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET
│   │   │   │       ├── transcript/route.ts
│   │   │   │       └── recording/route.ts
│   │   │   ├── pipeline/route.ts         # GET, PUT
│   │   │   ├── bot/
│   │   │   │   ├── config/route.ts       # GET, PUT
│   │   │   │   ├── knowledge/route.ts    # POST (upload)
│   │   │   │   ├── knowledge/[fileId]/route.ts  # DELETE
│   │   │   │   └── test-call/route.ts    # POST
│   │   │   ├── messages/
│   │   │   │   └── [leadId]/
│   │   │   │       ├── route.ts          # GET (history)
│   │   │   │       └── send/route.ts     # POST
│   │   │   ├── billing/
│   │   │   │   ├── route.ts              # GET
│   │   │   │   ├── subscribe/route.ts    # POST
│   │   │   │   ├── change-plan/route.ts  # POST
│   │   │   │   └── invoices/route.ts     # GET
│   │   │   ├── team/
│   │   │   │   ├── route.ts              # GET
│   │   │   │   ├── invite/route.ts       # POST
│   │   │   │   └── [userId]/route.ts     # PATCH
│   │   │   ├── analytics/
│   │   │   │   ├── dashboard/route.ts    # GET
│   │   │   │   ├── calls/route.ts        # GET
│   │   │   │   └── funnel/route.ts       # GET
│   │   │   └── auth/[...nextauth]/route.ts
│   │   │
│   │   ├── layout.tsx                    # Root layout
│   │   └── page.tsx                      # Landing page (public)
│   │
│   ├── components/                       # React components
│   │   ├── kanban/
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── Card.tsx
│   │   │   └── CardDetail.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── calls/
│   │   │   ├── CallLog.tsx
│   │   │   ├── TranscriptViewer.tsx
│   │   │   └── AudioPlayer.tsx
│   │   ├── bot/
│   │   │   ├── PromptEditor.tsx
│   │   │   ├── VoiceSelector.tsx
│   │   │   └── BehaviorSettings.tsx
│   │   ├── billing/
│   │   │   ├── PlanSelector.tsx
│   │   │   └── UsageMeter.tsx
│   │   └── ui/                           # shadcn/ui components
│   │
│   ├── lib/                              # Backend logic (modules)
│   │   ├── core/
│   │   │   ├── db/
│   │   │   │   ├── connection.ts         # MongoDB singleton
│   │   │   │   ├── models/               # Mongoose models
│   │   │   │   │   ├── Organization.ts
│   │   │   │   │   ├── User.ts
│   │   │   │   │   ├── Lead.ts
│   │   │   │   │   ├── Call.ts
│   │   │   │   │   ├── Pipeline.ts
│   │   │   │   │   ├── BotConfig.ts
│   │   │   │   │   ├── Message.ts
│   │   │   │   │   └── Subscription.ts
│   │   │   │   ├── indexes.ts
│   │   │   │   └── tenant.ts             # withTenant() helper
│   │   │   ├── queue/
│   │   │   │   ├── connection.ts         # Redis + BullMQ connection
│   │   │   │   └── queues.ts             # Queue definitions (all 8)
│   │   │   ├── auth/
│   │   │   │   ├── config.ts             # Auth.js config
│   │   │   │   ├── session.ts            # getSession helper
│   │   │   │   └── rbac.ts              # requireRole()
│   │   │   ├── realtime/
│   │   │   │   └── pusher.ts             # broadcastToOrg()
│   │   │   ├── storage/
│   │   │   │   └── r2.ts                # upload/download/getSignedUrl
│   │   │   ├── crypto/
│   │   │   │   └── encryption.ts         # encrypt/decrypt (AES-256-GCM)
│   │   │   └── validators/
│   │   │       ├── lead.ts               # Zod schemas for Lead
│   │   │       ├── call.ts
│   │   │       ├── bot.ts
│   │   │       └── billing.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── crm/
│   │   │   │   ├── lead-service.ts       # CRUD, search, filter
│   │   │   │   ├── pipeline-service.ts   # Column management
│   │   │   │   └── qualification.ts      # AI qualification logic
│   │   │   ├── voice/
│   │   │   │   ├── vapi-service.ts       # VAPI SDK wrapper
│   │   │   │   ├── telnyx-service.ts     # Telnyx API
│   │   │   │   ├── call-manager.ts       # Orchestration (initiate, retry, complete)
│   │   │   │   ├── transcript-service.ts # Save/process transcripts
│   │   │   │   └── ai-summary.ts        # Post-call LLM analysis
│   │   │   ├── channels/
│   │   │   │   ├── whatsapp-service.ts   # WA Cloud API
│   │   │   │   ├── instagram-service.ts  # IG Messaging API
│   │   │   │   ├── lead-form-service.ts  # Public API handler
│   │   │   │   └── unified-messaging.ts  # Channel abstraction
│   │   │   ├── bot/
│   │   │   │   ├── config-service.ts     # BotConfig CRUD
│   │   │   │   ├── knowledge-service.ts  # PDF upload + vector store
│   │   │   │   └── prompt-builder.ts     # System prompt construction
│   │   │   ├── billing/
│   │   │   │   ├── forte-service.ts      # ForteBank API
│   │   │   │   ├── plan-service.ts       # Plan management
│   │   │   │   ├── usage-service.ts      # Minute tracking
│   │   │   │   └── subscription-service.ts
│   │   │   ├── team/
│   │   │   │   └── team-service.ts       # Invite, CRUD, role management
│   │   │   └── analytics/
│   │   │       ├── dashboard-service.ts
│   │   │       ├── call-stats.ts
│   │   │       └── funnel-service.ts
│   │   │
│   │   └── utils/
│   │       ├── constants.ts
│   │       ├── errors.ts                 # AppError class
│   │       ├── phone.ts                  # Phone number formatting (+7...)
│   │       └── working-hours.ts          # isWithinWorkingHours(), getNext...
│   │
│   ├── hooks/                            # React hooks
│   │   ├── useKanban.ts
│   │   ├── useLeads.ts
│   │   ├── useSocket.ts                  # Pusher subscription
│   │   ├── useCalls.ts
│   │   └── useMessages.ts
│   │
│   └── types/                            # Shared TypeScript types
│       ├── lead.ts
│       ├── call.ts
│       ├── organization.ts
│       ├── bot.ts
│       ├── message.ts
│       └── billing.ts
│
├── workers/                              # Standalone BullMQ workers (Railway)
│   ├── index.ts                          # Worker runner (starts all workers)
│   ├── lead-worker.ts
│   ├── call-worker.ts
│   ├── vapi-event-worker.ts
│   ├── message-worker.ts
│   ├── billing-worker.ts
│   ├── retry-worker.ts
│   └── notification-worker.ts
│
├── scripts/                              # Utility scripts
│   ├── seed.ts                           # Seed demo data
│   └── create-indexes.ts                 # MongoDB index creation
│
├── public/
├── .env.local                            # Local env vars (gitignored)
├── .env.example                          # Template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 14. MVP Scope vs Future Phases

### 14.1. Фаза 1: MVP (6-8 недель)

**Цель:** работающий демо, который можно показать первым клиентам.

| Sprint | Неделя | Фокус | Что делаем |
|--------|--------|-------|------------|
| 1 | 1-2 | Foundation | Next.js + MongoDB + Auth.js + RBAC + layout + базовые модели |
| 2 | 3-4 | CRM Core | Kanban board (dnd-kit) + CRUD лидов + pipeline + Pusher real-time |
| 3 | 5-6 | Voice Engine | VAPI + Telnyx + BullMQ + call initiation + webhook → transcript → move card |
| 4 | 7-8 | Channels + Polish | WhatsApp webhook + chat UI + bot config UI + demo seed data |

**Что НЕ входит в MVP:**
- Instagram integration (добавить на Sprint 5)
- Knowledge base / RAG (PDF upload, Sprint 5)
- ForteBank billing (Sprint 6, до MVP — ручное управление подписками)
- Казахский язык (только русский)
- Входящие звонки
- Analytics dashboard (базовые счётчики, не графики)

### 14.2. Фаза 2: Post-MVP (после первых 5-10 клиентов)

| Feature | Приоритет | Описание |
|---------|-----------|----------|
| Instagram DM | Высокий | Второй по популярности канал для KZ бизнесов |
| Knowledge Base / RAG | Высокий | Бот отвечает из PDF прайсов и FAQ клиента |
| ForteBank billing | Высокий | Автоматические подписки в KZT |
| Analytics dashboard | Средний | Графики, конверсия воронки, ROI звонков |
| Test call из UI | Средний | Клиент тестирует бота перед запуском |
| Website widget | Средний | JS-виджет для сайтов клиентов (lead form) |
| Onboarding wizard | Средний | Пошаговая настройка для новых клиентов |

### 14.3. Фаза 3: Scale (после PMF, >50 клиентов)

| Feature | Описание |
|---------|----------|
| Go Voice Service | Собственный voice pipeline на Go + LiveKit (замена VAPI) |
| Казахский язык | Gladia STT для казахского |
| Входящие звонки | IVR, routing на менеджеров |
| Multi-pipeline | Несколько воронок на организацию |
| API для интеграций | Публичный REST API для сторонних CRM |
| PostgreSQL для billing | Строгий ACID для финансовых операций |
| Kubernetes | Микросервисная инфраструктура |

---

## 15. Ключевые риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Telnyx KZ номера блокируются антифродом | Средняя | Высокое | Параллельно подключить Beeline KZ мобильный номер |
| VAPI latency >2 сек | Средняя | Высокое | Оптимизация промптов (короткие), Cartesia TTS вместо ElevenLabs, мониторинг p95 |
| Low answer rate с National номеров | Высокая | Среднее | Мобильный номер от Beeline/Tele2 для продакшна |
| MongoDB не справляется с аналитикой | Низкая | Среднее | Вынести аналитику в отдельный PostgreSQL на Фазе 3 |
| Vercel Functions timeout на тяжёлых webhook | Низкая | Высокое | Все webhooks — lightweight: parse → enqueue → 200 OK |
| ForteBank API недоступен | Низкая | Среднее | Retry + fallback на ручное выставление счёта |
| VAPI стоимость растёт при объёме | Высокая | Среднее | Мониторинг cost/minute, переход на собственный pipeline при >$5000/мес |

---

## 16. Мониторинг и KPI

### 16.1. Технические метрики

| Метрика | Цель | Инструмент |
|---------|------|------------|
| API response time (p95) | <200ms | Sentry Performance |
| Webhook processing time | <5 сек | BullMQ metrics + Axiom logs |
| Error rate | <1% | Sentry |
| Uptime | >99.5% | BetterUptime |
| BullMQ queue depth | <100 jobs | Bull Board dashboard |
| MongoDB query time (p95) | <50ms | Atlas Performance Advisor |

### 16.2. Бизнес-метрики (трекаются в analytics module)

| Метрика | Цель | Описание |
|---------|------|----------|
| Call completion rate | >70% | % звонков, на которые ответили |
| Avg call duration | 2-4 мин | Слишком короткие = не квалифицирует, слишком длинные = дорого |
| First response latency | <1.5 сек | Время ответа бота (из VAPI metrics) |
| Qualification accuracy | >80% | AI правильно определяет hot/cold lead |
| Lead-to-call time | <30 сек | От создания лида до начала звонка |
| Cost per call minute | <$0.25 | VAPI + Telnyx + LLM |

---

*Документ подготовлен для команды VOXI. Подлежит обновлению по мере разработки. Март 2026.*
