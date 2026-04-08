"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallTranscriptDialog } from "@/components/calls/call-transcript-dialog";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle2,
  FileText,
  Timer,
} from "lucide-react";
import { demoCalls, type DemoCall } from "@/data/demo-calls";
import { callStats as defaultCallStats } from "@/data/demo-stats";

// ── Helpers ──────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds === 0) return "---";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatAvgDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} мин ${secs} сек`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getSentimentDot(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "bg-green-400";
    case "neutral":
      return "bg-yellow-400";
    case "negative":
      return "bg-red-400";
    default:
      return "bg-zinc-500";
  }
}

function getSentimentLabel(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "Позитивный";
    case "neutral":
      return "Нейтральный";
    case "negative":
      return "Негативный";
    default:
      return sentiment;
  }
}

// ── Component ────────────────────────────────────────────────────

// Compute stats from a list of calls
function computeCallStats(calls: DemoCall[]) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayCalls = calls.filter(
    (c) => c.startedAt && c.startedAt.slice(0, 10) === todayStr
  );
  const weekCalls = calls.filter(
    (c) => c.startedAt && new Date(c.startedAt) >= weekAgo
  );
  const monthCalls = calls.filter(
    (c) => c.startedAt && new Date(c.startedAt) >= monthAgo
  );

  function avgDur(arr: DemoCall[]) {
    const completed = arr.filter((c) => c.status === "completed" && c.duration > 0);
    if (completed.length === 0) return 0;
    return Math.round(
      completed.reduce((sum, c) => sum + c.duration, 0) / completed.length
    );
  }

  const totalMinutesUsed = Math.round(
    calls.reduce((sum, c) => sum + c.duration, 0) / 60
  );

  return {
    today: {
      total: todayCalls.length,
      completed: todayCalls.filter((c) => c.status === "completed").length,
      noAnswer: todayCalls.filter((c) => c.status === "no_answer").length,
      avgDuration: avgDur(todayCalls),
    },
    thisWeek: {
      total: weekCalls.length,
      completed: weekCalls.filter((c) => c.status === "completed").length,
      noAnswer: weekCalls.filter((c) => c.status === "no_answer").length,
      avgDuration: avgDur(weekCalls),
    },
    thisMonth: {
      total: monthCalls.length,
      completed: monthCalls.filter((c) => c.status === "completed").length,
      noAnswer: monthCalls.filter((c) => c.status === "no_answer").length,
      avgDuration: avgDur(monthCalls),
    },
    avgCallDuration: avgDur(calls),
    totalMinutesUsed,
    minutesLimit: 2000,
  };
}

export function CallsTable() {
  const [calls, setCalls] = useState<DemoCall[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<DemoCall | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch calls from API on mount
  useEffect(() => {
    fetch("/api/calls")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch calls");
        return res.json();
      })
      .then((data) => {
        // API returns a flat array or { calls: [...] }
        const callsArray = Array.isArray(data) ? data : data.calls;
        if (!callsArray || !Array.isArray(callsArray) || callsArray.length === 0) return;

        const mapped: DemoCall[] = callsArray.map((c: any) => ({
          id: c.id,
          organizationId: c.organizationId,
          leadId: c.leadId,
          leadName: c.lead?.name || "Неизвестный",
          direction: c.direction?.toLowerCase() || "outbound",
          status: c.status?.toLowerCase() || "completed",
          duration: c.duration || 0,
          summary: c.summary || "",
          sentiment: c.sentiment?.toLowerCase() || "neutral",
          qualification: {
            budget: c.qualBudget || "",
            need: c.qualNeed || "",
            timeline: c.qualTimeline || "",
            score: c.qualScore || 0,
          },
          retryCount: c.retryCount || 0,
          startedAt: c.startedAt || c.createdAt,
          endedAt: c.endedAt || c.createdAt,
          createdAt: c.createdAt,
          transcript: (c.transcripts || []).map((t: any) => ({
            role: t.role?.toLowerCase() || "assistant",
            content: t.content,
            timestamp: t.timestamp || 0,
          })),
        }));
        setCalls(mapped);
      })
      .catch(() => {
        // Keep demo data as fallback — no action needed
      });
  }, []);

  const callStats = useMemo(() => computeCallStats(calls), [calls]);

  const filteredCalls = useMemo(() => {
    return calls
      .filter((call) => {
        if (directionFilter !== "all" && call.direction !== directionFilter)
          return false;
        if (statusFilter !== "all" && call.status !== statusFilter) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
  }, [calls, directionFilter, statusFilter]);

  const minutesPercent = Math.round(
    (callStats.totalMinutesUsed / callStats.minutesLimit) * 100
  );

  function handleOpenTranscript(call: DemoCall) {
    setSelectedCall(call);
    setDialogOpen(true);
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Звонки сегодня
            </CardTitle>
            <Phone className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {callStats.today.total}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              За неделю: {callStats.thisWeek.total}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Завершённых
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {callStats.today.completed}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Без ответа: {callStats.today.noAnswer}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Средняя длительность
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatAvgDuration(callStats.today.avgDuration)}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              За месяц: {formatAvgDuration(callStats.thisMonth.avgDuration)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Минуты использованы
            </CardTitle>
            <Timer className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {callStats.totalMinutesUsed}{" "}
              <span className="text-sm font-normal text-zinc-500">
                / {callStats.minutesLimit}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${minutesPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{minutesPercent}% лимита</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select defaultValue="all" onValueChange={(v) => v && setDirectionFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Направление" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Все направления</SelectItem>
              <SelectItem value="outbound">Исходящие</SelectItem>
              <SelectItem value="inbound">Входящие</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select defaultValue="all" onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="completed">Завершённые</SelectItem>
              <SelectItem value="no_answer">Без ответа</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <span className="text-sm text-zinc-500 ml-auto">
          {filteredCalls.length} из {calls.length} звонков
        </span>
      </div>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Лид</TableHead>
                <TableHead className="text-zinc-400">Направление</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-zinc-400">Длительность</TableHead>
                <TableHead className="text-zinc-400">Sentiment</TableHead>
                <TableHead className="text-zinc-400">Оценка</TableHead>
                <TableHead className="text-zinc-400">Дата</TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => (
                <TableRow
                  key={call.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                  onClick={() => handleOpenTranscript(call)}
                >
                  <TableCell className="font-medium text-zinc-100">
                    {call.leadName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        call.direction === "outbound"
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                          : "bg-green-500/20 text-green-400 border-green-500/30"
                      }
                    >
                      {call.direction === "outbound" ? (
                        <>
                          <PhoneOutgoing className="h-3 w-3 mr-1" />
                          Исходящий
                        </>
                      ) : (
                        <>
                          <PhoneIncoming className="h-3 w-3 mr-1" />
                          Входящий
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        call.status === "completed"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : call.status === "no_answer"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {call.status === "completed"
                        ? "Завершён"
                        : call.status === "no_answer"
                        ? "Без ответа"
                        : "Ошибка"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono text-sm">
                    {formatDuration(call.duration)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${getSentimentDot(
                          call.sentiment
                        )}`}
                      />
                      <span className="text-zinc-400 text-sm">
                        {getSentimentLabel(call.sentiment)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {call.qualification.score > 0 ? (
                      <span
                        className={`font-bold ${getScoreColor(
                          call.qualification.score
                        )}`}
                      >
                        {call.qualification.score}
                      </span>
                    ) : (
                      <span className="text-zinc-600">---</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {formatDate(call.startedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTranscript(call);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Транскрипт
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCalls.length === 0 && (
                <TableRow className="border-zinc-800">
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-zinc-500"
                  >
                    Нет звонков по выбранным фильтрам
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transcript Dialog */}
      <CallTranscriptDialog
        call={selectedCall}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
