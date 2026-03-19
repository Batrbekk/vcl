# VOXI — AI-платформа автоматизации B2B продаж

## Что это
VOXI — SaaS платформа для автоматизации продаж в Казахстане. AI-бот звонит лидам, квалифицирует их, двигает карточки по Kanban-воронке. Менеджеры работают только с тёплыми лидами.

## Статус проекта
- **Дедлайн:** демо инвестору 20 марта 2026
- **Этап:** Активная разработка бэкенда + фронта
- **Маркетинговый сайт:** удалён (был landing page на Next.js, снесён чтобы сфокусироваться на платформе)

## Стек
- **Framework:** Next.js 16 (App Router, TypeScript)
- **UI:** shadcn/ui + Tailwind CSS (тёмная тема, zinc-950/zinc-900)
- **ORM:** Prisma 7 (PostgreSQL)
- **Auth:** NextAuth v5 (JWT + Credentials provider)
- **Voice AI:** VAPI.ai (STT→LLM→TTS оркестрация)
- **Telephony:** Telnyx (KZ номера, SIP trunk)
- **Charts:** Recharts
- **DnD:** @dnd-kit
- **Icons:** Lucide React
- **Deploy:** всё на VPS (Ubuntu), PostgreSQL локально на сервере

## Структура проекта
```
vcl/
├── CLAUDE.md              # этот файл
├── voxi-description.md    # описание продукта и исследования
├── voxi-architecture.md   # полная архитектура системы
├── backend-architecture.md # архитектура бэкенда
├── cto-questions.md       # вопросы CTO и план действий
├── frontend/              # Next.js приложение
│   ├── prisma/
│   │   └── schema.prisma  # 8 моделей: Organization, User, Pipeline, PipelineStage, Lead, Call, Transcript, Message
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/     # Страница входа
│   │   │   ├── (dashboard)/      # Все страницы платформы (layout с sidebar)
│   │   │   │   ├── page.tsx      # Дашборд
│   │   │   │   ├── leads/        # Kanban доска лидов
│   │   │   │   ├── calls/        # Журнал звонков
│   │   │   │   ├── bot/          # Настройки AI-бота
│   │   │   │   ├── integrations/ # Интеграции
│   │   │   │   ├── team/         # Команда
│   │   │   │   ├── billing/      # Тарифы
│   │   │   │   └── settings/     # Настройки
│   │   │   └── api/              # API routes
│   │   ├── components/
│   │   │   ├── ui/               # shadcn компоненты
│   │   │   └── dashboard/        # sidebar, header, shell
│   │   ├── lib/
│   │   │   ├── db.ts             # Prisma client singleton
│   │   │   ├── auth.ts           # NextAuth config (Prisma, не mongoose!)
│   │   │   └── vapi/client.ts    # VAPI integration
│   │   ├── data/                 # Демо данные (seed, static fallback)
│   │   └── generated/prisma/     # Prisma generated client
│   └── .env                      # Переменные окружения
```

## Prisma Schema (ключевые модели)
- **Organization** — компания клиента, настройки бота, подписка
- **User** — пользователь (OWNER/ADMIN/MANAGER), привязан к Organization
- **Pipeline + PipelineStage** — воронка продаж с этапами
- **Lead** — лид с контактами, стадией, квалификацией
- **Call** — звонок (inbound/outbound), транскрипт, AI-анализ
- **Transcript** — отдельные реплики звонка (role + content + timestamp)
- **Message** — сообщения WhatsApp/Instagram/SMS

## Демо-сценарий
- **Компания:** Nurbol Invest (инвестиционная компания, Алматы)
- **Пользователи:** almat@nurbolinvest.kz (owner), dinara/erzhan (managers), пароль: demo123
- **20 лидов** по воронке, 10 звонков с транскриптами, 8 сообщений
- **Индустрия:** инвестиционные продажи

## Что сделано
1. ✅ Prisma schema со всеми моделями (PostgreSQL)
2. ✅ Prisma client сгенерирован
3. ✅ NextAuth настроен (Prisma, JWT, Credentials)
4. ✅ Login page
5. ✅ Dashboard layout (sidebar + header)
6. ✅ VAPI client library
7. ✅ Демо данные подготовлены (seed.ts, demo-leads.ts, demo-calls.ts, demo-stats.ts)
8. ✅ shadcn/ui компоненты установлены (button, card, badge, input, textarea, select, table, tabs, dialog, sidebar, chart, и др.)

## Что нужно доделать
1. ❌ Страницы дашборда (leads kanban, calls, bot, integrations, team, billing, settings)
2. ❌ API routes (leads CRUD, calls, bot config)
3. ❌ Seed script для PostgreSQL (текущий seed.ts использует MongoDB — нужно переписать на Prisma)
4. ❌ VAPI webhook handler (/api/webhooks/vapi)
5. ❌ Реальные звонки (outbound + inbound)
6. ❌ Настройка PostgreSQL на VPS
7. ❌ Деплой на VPS

## Важные решения
- **PostgreSQL** вместо MongoDB (реляционная структура лучше для CRM)
- **Модульный монолит** — всё в одном Next.js приложении
- Auth через **Prisma** (НЕ mongoose!) — `import { prisma } from '@/lib/db'`
- Prisma client: `import { PrismaClient } from '@/generated/prisma'`
- Все тексты на **русском языке**
- Тёмная тема: bg-zinc-950, cards bg-zinc-900, accent indigo-500
- shadcn MCP не работает на Windows — используем context7 для документации

## Бизнес-требования (от основателя)
- Демо для потенциального инвестора
- ВСЕ страницы должны быть
- Реальные звонки (исходящие + входящие) через VAPI + Telnyx
- Авторизация обязательна
- Индустрия демо: инвестиционные продажи
- VPS Ubuntu для деплоя (PostgreSQL + Next.js)
