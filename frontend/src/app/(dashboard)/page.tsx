import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Phone,
  TrendingUp,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  dashboardKPIs as demoKPIs,
  callsByDay,
  leadsBySource,
  funnelData,
  recentActivity as demoRecentActivity,
} from "@/data/demo-stats";
import {
  CallsBarChart,
  LeadsSourcePieChart,
  LeadsSourceLegend,
  FunnelChart,
} from "@/components/dashboard/dashboard-charts";

// ── KPI icon map ────────────────────────────────────────────────

const KPI_ICONS: Record<string, React.ReactNode> = {
  kpi_leads: <Users className="h-4 w-4 text-indigo-400" />,
  kpi_calls: <Phone className="h-4 w-4 text-indigo-400" />,
  kpi_conversion: <TrendingUp className="h-4 w-4 text-indigo-400" />,
  kpi_revenue: <Banknote className="h-4 w-4 text-indigo-400" />,
};

// ── Activity icon map ───────────────────────────────────────────

function ActivityIcon({ type }: { type: "call" | "lead" | "message" }) {
  switch (type) {
    case "call":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
          <Phone className="h-4 w-4 text-indigo-400" />
        </div>
      );
    case "lead":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          <Users className="h-4 w-4 text-emerald-400" />
        </div>
      );
    case "message":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <MessageSquare className="h-4 w-4 text-amber-400" />
        </div>
      );
  }
}

// ── Time formatting ─────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);

  if (diffMin < 60) return `${diffMin} мин назад`;
  if (diffHrs < 24) return `${diffHrs} ч назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ── Fetch real KPIs from DB ─────────────────────────────────────

async function fetchDashboardData(organizationId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalLeads, activeLeads, callsToday, wonDeals, totalDeals, recentCalls, recentLeads] =
    await Promise.all([
      prisma.lead.count({ where: { organizationId } }),
      prisma.lead.count({
        where: {
          organizationId,
          status: { in: ["NEW", "QUALIFIED", "IN_PROGRESS"] },
        },
      }),
      prisma.call.count({
        where: { organizationId, createdAt: { gte: todayStart } },
      }),
      prisma.lead.count({
        where: { organizationId, status: "WON" },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          status: { in: ["WON", "LOST", "QUALIFIED", "IN_PROGRESS"] },
        },
      }),
      prisma.call.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lead: { select: { name: true } } },
      }),
      prisma.lead.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, source: true, createdAt: true },
      }),
    ]);

  const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 1000) / 10 : 0;

  // Build KPI cards from real data
  const dashboardKPIs = [
    {
      id: "kpi_leads",
      title: "Активные лиды",
      value: activeLeads,
      change: totalLeads > 0 ? Math.round((activeLeads / totalLeads) * 100) : 0,
      changeLabel: `из ${totalLeads} всего`,
      trend: "up" as const,
    },
    {
      id: "kpi_calls",
      title: "Звонков сегодня",
      value: callsToday,
      change: callsToday,
      changeLabel: "за сегодня",
      trend: callsToday > 0 ? ("up" as const) : ("down" as const),
    },
    {
      id: "kpi_conversion",
      title: "Конверсия",
      value: `${conversionRate}%`,
      change: conversionRate,
      changeLabel: "лид → сделка",
      trend: conversionRate > 10 ? ("up" as const) : ("down" as const),
    },
    {
      id: "kpi_revenue",
      title: "Сделки (won)",
      value: wonDeals,
      change: wonDeals,
      changeLabel: "закрытых сделок",
      trend: wonDeals > 0 ? ("up" as const) : ("down" as const),
    },
  ];

  // Build recent activity from real calls + leads
  const recentActivity: Array<{
    id: string;
    type: "call" | "lead" | "message";
    description: string;
    user: string | null;
    timestamp: string;
  }> = [];

  for (const call of recentCalls) {
    recentActivity.push({
      id: call.id,
      type: "call",
      description: `${call.direction === "OUTBOUND" ? "Исходящий" : "Входящий"} звонок — ${call.lead.name} (${call.status === "COMPLETED" ? "завершён" : call.status === "NO_ANSWER" ? "без ответа" : call.status.toLowerCase()})`,
      user: "VOXI (AI)",
      timestamp: call.createdAt.toISOString(),
    });
  }

  for (const lead of recentLeads) {
    recentActivity.push({
      id: lead.id,
      type: "lead",
      description: `Лид — ${lead.name} (${lead.source.toLowerCase()})`,
      user: null,
      timestamp: lead.createdAt.toISOString(),
    });
  }

  // Sort by timestamp descending and take first 8
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    dashboardKPIs,
    recentActivity: recentActivity.slice(0, 8),
  };
}

// ── Page ────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Пользователь";
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  // Determine whether to use real DB or demo fallback
  type KPI = {
    id: string;
    title: string;
    value: number | string;
    change: number;
    changeLabel: string;
    trend: "up" | "down";
  };
  type Activity = {
    id: string;
    type: "call" | "lead" | "message";
    description: string;
    user: string | null;
    timestamp: string;
  };

  let dashboardKPIs: KPI[] = demoKPIs;
  let recentActivity: Activity[] = demoRecentActivity;
  let usingDemoData = true;

  const isDemoUser = !organizationId || organizationId.startsWith("demo_");

  if (!isDemoUser) {
    try {
      const data = await fetchDashboardData(organizationId);
      dashboardKPIs = data.dashboardKPIs;
      recentActivity = data.recentActivity;
      usingDemoData = false;
    } catch (error) {
      console.error("Dashboard DB query failed, using demo fallback:", error);
      // Keep demo data as fallback
    }
  }

  return (
    <div className="space-y-8">
      {usingDemoData && (
        <div className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 text-center">
          Отображаются демо-данные
        </div>
      )}
      {/* ── Welcome Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Добро пожаловать, {userName}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Обзор активности вашей организации за сегодня
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardKPIs.map((kpi) => (
          <Card key={kpi.id} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {kpi.title}
              </CardTitle>
              {KPI_ICONS[kpi.id]}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={
                    kpi.trend === "up" ? "text-emerald-500" : "text-red-500"
                  }
                >
                  {kpi.change > 0 ? "+" : ""}
                  {kpi.change}
                </span>
                <span className="text-zinc-500">{kpi.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      {false && <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart: Calls by day */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Звонки за неделю
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CallsBarChart data={callsByDay} />
            <div className="mt-3 flex items-center justify-center gap-5 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                Завершённые
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-600" />
                Без ответа
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart: Leads by source */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Лиды по источникам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsSourcePieChart data={leadsBySource} />
            <LeadsSourceLegend data={leadsBySource} />
          </CardContent>
        </Card>
      </div>}

      {/* ── Funnel + Recent Activity ────────────────────────────── */}
      {false && <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel chart */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Воронка продаж
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base font-semibold text-white">
                Последняя активность
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.slice(0, 8).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3"
                >
                  <ActivityIcon type={activity.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-zinc-200">
                      {activity.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{formatTimestamp(activity.timestamp)}</span>
                      {activity.user && (
                        <>
                          <span className="text-zinc-700">&middot;</span>
                          <span>{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>}
    </div>
  );
}
