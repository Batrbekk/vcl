// =============================================================================
// Статические демо-данные для дашборда (для fallback без MongoDB)
// =============================================================================

// ── Лиды по стадиям воронки ──────────────────────────────────
export const leadsByStage = [
  { stageId: 'new', stageName: 'Новый', count: 4, color: '#6366f1' },
  { stageId: 'qualified', stageName: 'Квалифицирован', count: 3, color: '#f59e0b' },
  { stageId: 'in_progress', stageName: 'В работе', count: 3, color: '#3b82f6' },
  { stageId: 'meeting', stageName: 'Встреча назначена', count: 2, color: '#8b5cf6' },
  { stageId: 'won', stageName: 'Сделка', count: 2, color: '#22c55e' },
  { stageId: 'lost', stageName: 'Отказ', count: 3, color: '#ef4444' },
];

// ── Общая статистика ─────────────────────────────────────────
export const overviewStats = {
  totalLeads: 17,
  activeLeads: 12, // new + qualified + in_progress + meeting
  wonDeals: 2,
  lostDeals: 3,
  conversionRate: 14.3, // 2 won / 14 (won + lost + in_progress + qualified + meeting) * 100
  avgQualificationScore: 74, // средний балл квалификации по завершённым звонкам
  totalDealValue: '170 000 000 тг', // 95 + 75 млн
};

// ── Статистика звонков ───────────────────────────────────────
export const callStats = {
  today: {
    total: 2,
    completed: 1,
    noAnswer: 1,
    avgDuration: 175, // секунды (только call_8 за сегодня)
  },
  thisWeek: {
    total: 7,
    completed: 5,
    noAnswer: 2,
    avgDuration: 228, // средняя длительность завершённых звонков за неделю
  },
  thisMonth: {
    total: 10,
    completed: 8,
    noAnswer: 2,
    avgDuration: 227, // (245+198+312+380+210+156+175+142) / 8
  },
  avgCallDuration: 227, // общая средняя длительность
  totalMinutesUsed: 847,
  minutesLimit: 2000,
};

// ── Лиды по источнику (для pie chart) ───────────────────────
export const leadsBySource = [
  { source: 'website', label: 'Сайт', count: 5, color: '#3b82f6' },
  { source: 'whatsapp', label: 'WhatsApp', count: 4, color: '#22c55e' },
  { source: 'phone', label: 'Телефон', count: 4, color: '#f59e0b' },
  { source: 'instagram', label: 'Instagram', count: 3, color: '#ec4899' },
  { source: 'manual', label: 'Вручную', count: 1, color: '#6b7280' },
];

// ── Звонки по дням за последние 7 дней (для bar chart) ──────
export const callsByDay = [
  { date: '2026-03-14', label: '14 мар', total: 1, completed: 0, noAnswer: 1 },
  { date: '2026-03-15', label: '15 мар', total: 1, completed: 1, noAnswer: 0 },
  { date: '2026-03-16', label: '16 мар', total: 0, completed: 0, noAnswer: 0 },
  { date: '2026-03-17', label: '17 мар', total: 1, completed: 1, noAnswer: 0 },
  { date: '2026-03-18', label: '18 мар', total: 3, completed: 3, noAnswer: 0 },
  { date: '2026-03-19', label: '19 мар', total: 2, completed: 2, noAnswer: 0 },
  { date: '2026-03-20', label: '20 мар', total: 2, completed: 1, noAnswer: 1 },
];

// ── Конверсия по этапам воронки (для funnel chart) ──────────
export const funnelData = [
  { stage: 'Новый', count: 17, percentage: 100 },
  { stage: 'Квалифицирован', count: 12, percentage: 70.6 },
  { stage: 'В работе', count: 7, percentage: 41.2 },
  { stage: 'Встреча назначена', count: 4, percentage: 23.5 },
  { stage: 'Сделка', count: 2, percentage: 11.8 },
];

// ── Топ менеджеров по результатам ───────────────────────────
export const managerPerformance = [
  {
    id: 'user_1',
    name: 'Алмат Жумабаев',
    role: 'owner',
    leadsAssigned: 5,
    dealsWon: 1,
    dealValue: '95 000 000 тг',
    callsMade: 3,
    avgQualificationScore: 96,
  },
  {
    id: 'user_2',
    name: 'Динара Касымова',
    role: 'manager',
    leadsAssigned: 5,
    dealsWon: 0,
    dealValue: '0 тг',
    callsMade: 2,
    avgQualificationScore: 83,
  },
  {
    id: 'user_3',
    name: 'Ержан Нурланов',
    role: 'manager',
    leadsAssigned: 5,
    dealsWon: 1,
    dealValue: '75 000 000 тг',
    callsMade: 3,
    avgQualificationScore: 72,
  },
];

// ── Активность за последние 24 часа ─────────────────────────
export const recentActivity = [
  {
    id: 'activity_1',
    type: 'call' as const,
    description: 'Квалификационный звонок — Тимур Байжанов',
    user: 'VOXI (AI)',
    timestamp: '2026-03-20T10:45:00Z',
  },
  {
    id: 'activity_2',
    type: 'message' as const,
    description: 'Входящее сообщение WhatsApp — Тимур Байжанов',
    user: null,
    timestamp: '2026-03-20T10:40:00Z',
  },
  {
    id: 'activity_3',
    type: 'lead' as const,
    description: 'Новый лид — Гульнара Абдуллаева (Instagram)',
    user: null,
    timestamp: '2026-03-20T09:10:00Z',
  },
  {
    id: 'activity_4',
    type: 'call' as const,
    description: 'Звонок без ответа — Мадина Оразбекова',
    user: 'VOXI (AI)',
    timestamp: '2026-03-20T09:00:00Z',
  },
  {
    id: 'activity_5',
    type: 'call' as const,
    description: 'Follow-up звонок — Асем Жунусова (бюджет 200 млн тг)',
    user: 'VOXI (AI)',
    timestamp: '2026-03-19T10:00:00Z',
  },
  {
    id: 'activity_6',
    type: 'message' as const,
    description: 'Исходящее сообщение WhatsApp — Лаура Мукашева',
    user: 'Ержан Нурланов',
    timestamp: '2026-03-19T12:15:00Z',
  },
  {
    id: 'activity_7',
    type: 'call' as const,
    description: 'Входящий звонок — Лаура Мукашева (VIP, 500 млн тг)',
    user: 'VOXI (AI)',
    timestamp: '2026-03-19T16:00:00Z',
  },
  {
    id: 'activity_8',
    type: 'lead' as const,
    description: 'Новый лид — Айдар Сулейменов (сайт)',
    user: null,
    timestamp: '2026-03-19T14:25:00Z',
  },
];

// ── Sentiment breakdown по всем звонкам ─────────────────────
export const sentimentBreakdown = [
  { sentiment: 'positive', label: 'Позитивный', count: 4, color: '#22c55e' },
  { sentiment: 'neutral', label: 'Нейтральный', count: 6, color: '#f59e0b' },
  { sentiment: 'negative', label: 'Негативный', count: 0, color: '#ef4444' },
];

// ── Сводные KPI для заголовков дашборда ──────────────────────
export const dashboardKPIs = [
  {
    id: 'kpi_leads',
    title: 'Активные лиды',
    value: 12,
    change: +3,
    changeLabel: 'за неделю',
    trend: 'up' as const,
  },
  {
    id: 'kpi_calls',
    title: 'Звонков сегодня',
    value: 2,
    change: -1,
    changeLabel: 'vs вчера',
    trend: 'down' as const,
  },
  {
    id: 'kpi_conversion',
    title: 'Конверсия',
    value: '14.3%',
    change: +2.1,
    changeLabel: 'за месяц',
    trend: 'up' as const,
  },
  {
    id: 'kpi_revenue',
    title: 'Сумма сделок',
    value: '170 млн тг',
    change: +75,
    changeLabel: 'млн тг за месяц',
    trend: 'up' as const,
  },
];
