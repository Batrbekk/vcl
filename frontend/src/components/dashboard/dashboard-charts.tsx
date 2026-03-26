"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Bar Chart: Звонки за неделю ─────────────────────────────────

interface CallsByDayItem {
  date: string;
  label: string;
  total: number;
  completed: number;
  noAnswer: number;
}

export function CallsBarChart({ data }: { data: CallsByDayItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={{ stroke: "#3f3f46" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#fafafa",
            fontSize: 13,
          }}
          itemStyle={{ color: "#fafafa" }}
          labelStyle={{ color: "#a1a1aa" }}
          cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
        />
        <Bar
          dataKey="completed"
          name="Завершённые"
          fill="#6366f1"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="noAnswer"
          name="Без ответа"
          fill="#52525b"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Pie/Donut Chart: Лиды по источникам ─────────────────────────

interface LeadsBySourceItem {
  source: string;
  label: string;
  count: number;
  color: string;
}

export function LeadsSourcePieChart({ data }: { data: LeadsBySourceItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={110}
          paddingAngle={3}
          dataKey="count"
          nameKey="label"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#fafafa",
            fontSize: 13,
          }}
          itemStyle={{ color: "#fafafa" }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value: number, name: string) => [`${value} лидов`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Legend for Pie Chart ─────────────────────────────────────────

export function LeadsSourceLegend({ data }: { data: LeadsBySourceItem[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {data.map((item) => (
        <div key={item.source} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-zinc-400">
            {item.label}{" "}
            <span className="font-medium text-zinc-300">
              {item.count} ({Math.round((item.count / total) * 100)}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Funnel Chart: Воронка продаж ────────────────────────────────

interface FunnelItem {
  stage: string;
  count: number;
  percentage: number;
}

const FUNNEL_COLORS = [
  "#6366f1", // indigo-500
  "#818cf8", // indigo-400
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#22c55e", // green-500
];

export function FunnelChart({ data }: { data: FunnelItem[] }) {
  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const widthPercent = Math.max((item.count / maxCount) * 100, 8);

        return (
          <div key={item.stage} className="group">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-300">{item.stage}</span>
              <span className="text-zinc-500">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="relative h-8 w-full overflow-hidden rounded-md bg-zinc-800">
              <div
                className="flex h-full items-center rounded-md pl-3 transition-all duration-500"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                }}
              >
                <span className="text-xs font-semibold text-white drop-shadow-sm">
                  {item.percentage}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
