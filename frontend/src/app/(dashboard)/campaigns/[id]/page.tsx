"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Upload,
  Loader2,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneOff,
  PhoneMissed,
  SkipForward,
  Bot,
  Users,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface CampaignContact {
  id: string;
  name: string | null;
  phone: string;
  status: "PENDING" | "CALLING" | "COMPLETED" | "NO_ANSWER" | "FAILED" | "SKIPPED";
  callId: string | null;
  notes: string | null;
  calledAt: string | null;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  botConfig: { id: string; name: string } | null;
  botConfigId: string | null;
  totalContacts: number;
  completedCalls: number;
  contacts: CampaignContact[];
  createdAt: string;
}

interface BotOption {
  id: string;
  name: string;
}

// ── Status config ────────────────────────────────────────────

const campaignStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Черновик", className: "bg-zinc-700/50 text-zinc-300 border-zinc-600" },
  RUNNING: { label: "Идёт обзвон", className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse" },
  PAUSED: { label: "Пауза", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  COMPLETED: { label: "Завершена", className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const contactStatusConfig: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { label: "Ожидает", className: "bg-zinc-700/50 text-zinc-300 border-zinc-600", icon: Clock },
  CALLING: { label: "Звонок...", className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse", icon: Phone },
  COMPLETED: { label: "Завершён", className: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  NO_ANSWER: { label: "Нет ответа", className: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: PhoneMissed },
  FAILED: { label: "Ошибка", className: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  SKIPPED: { label: "Пропущен", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600", icon: SkipForward },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "---";
  const date = new Date(dateStr);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

// ── Component ────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Manual add
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addError, setAddError] = useState("");

  // Bot selector
  const [bots, setBots] = useState<BotOption[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [changingBot, setChangingBot] = useState(false);

  const fetchCampaign = useCallback(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (data.campaign) setCampaign(data.campaign);
      })
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const fetchBots = useCallback(() => {
    setBotsLoading(true);
    fetch("/api/bots")
      .then((res) => res.json())
      .then((data) => {
        if (data.bots) setBots(data.bots.map((b: any) => ({ id: b.id, name: b.name })));
      })
      .catch(() => {})
      .finally(() => setBotsLoading(false));
  }, []);

  useEffect(() => {
    fetchCampaign();
    fetchBots();
  }, [fetchCampaign, fetchBots]);

  // ── Actions ──────────────────────────────────────────────

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка запуска");
        return;
      }
      if (data.campaign) setCampaign(data.campaign);
    } catch {
      alert("Ошибка запуска");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка");
        return;
      }
      if (data.campaign) setCampaign(data.campaign);
    } catch {
      alert("Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Завершить кампанию? Это действие нельзя отменить.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка");
        return;
      }
      if (data.campaign) setCampaign(data.campaign);
    } catch {
      alert("Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBotChange = async (botId: string | null) => {
    if (!botId) return;
    setChangingBot(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botConfigId: botId }),
      });
      const data = await res.json();
      if (data.campaign) setCampaign(data.campaign);
    } catch {
      alert("Ошибка смены бота");
    } finally {
      setChangingBot(false);
    }
  };

  // ── Upload ──────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/campaigns/${campaignId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка загрузки");
        return;
      }
      // Refresh campaign data
      fetchCampaign();
    } catch {
      alert("Ошибка загрузки файла");
    } finally {
      setUploadLoading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Manual add ──────────────────────────────────────────

  const handleAddContact = async () => {
    if (!addPhone.trim()) {
      setAddError("Введите номер телефона");
      return;
    }
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: [{ name: addName.trim() || undefined, phone: addPhone.trim() }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Ошибка добавления");
        return;
      }
      setAddName("");
      setAddPhone("");
      fetchCampaign();
    } catch {
      setAddError("Ошибка добавления");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/campaigns")}
          className="border-zinc-700 text-zinc-400 hover:text-white h-8"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <div className="text-center py-16">
          <p className="text-zinc-400">Кампания не найдена</p>
        </div>
      </div>
    );
  }

  const sc = campaignStatusConfig[campaign.status] || campaignStatusConfig.DRAFT;
  const contacts = campaign.contacts || [];
  const stats = {
    total: contacts.length,
    pending: contacts.filter((c) => c.status === "PENDING").length,
    calling: contacts.filter((c) => c.status === "CALLING").length,
    completed: contacts.filter((c) => c.status === "COMPLETED").length,
    noAnswer: contacts.filter((c) => c.status === "NO_ANSWER").length,
    failed: contacts.filter((c) => c.status === "FAILED").length,
    skipped: contacts.filter((c) => c.status === "SKIPPED").length,
  };
  const isEditable = campaign.status === "DRAFT" || campaign.status === "PAUSED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/campaigns")}
          className="border-zinc-700 text-zinc-400 hover:text-white h-8"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
            <Badge variant="outline" className={sc.className}>
              {sc.label}
            </Badge>
          </div>
          {campaign.description && (
            <p className="mt-1 text-sm text-zinc-400">{campaign.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
            <Button
              onClick={handleStart}
              disabled={actionLoading}
              className="gap-2 bg-green-600 text-white hover:bg-green-500"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Запустить обзвон
            </Button>
          )}
          {campaign.status === "RUNNING" && (
            <>
              <Button
                onClick={handlePause}
                disabled={actionLoading}
                className="gap-2 bg-amber-600 text-white hover:bg-amber-500"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                Пауза
              </Button>
              <Button
                onClick={handleComplete}
                disabled={actionLoading}
                variant="outline"
                className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Завершить
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">Всего</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-xs text-zinc-500">Ожидают</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-300">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-zinc-500">Завершены</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-400">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PhoneMissed className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-zinc-500">Нет ответа</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-400">{stats.noAnswer}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-zinc-500">Ошибки</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-400">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-zinc-500">В процессе</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-indigo-400">{stats.calling}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bot card */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="h-5 w-5 text-indigo-400" />
            AI-бот
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditable ? (
            <div className="flex items-center gap-3">
              {botsLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка...
                </div>
              ) : bots.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Нет доступных ботов. Создайте бота в разделе &quot;AI-боты&quot;.
                </p>
              ) : (
                <Select
                  value={campaign.botConfigId || ""}
                  onValueChange={handleBotChange}
                  disabled={changingBot}
                >
                  <SelectTrigger className="w-64 border-zinc-700 bg-zinc-800 text-white">
                    <SelectValue placeholder="Выберите бота" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {bots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id} className="text-zinc-200">
                        {bot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {changingBot && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
            </div>
          ) : (
            <p className="text-sm text-zinc-300">
              {campaign.botConfig?.name || (
                <span className="text-zinc-500">Бот не выбран</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add contacts section (only if editable) */}
      {isEditable && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Добавить контакты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload area */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/30 px-6 py-8 cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors"
              >
                {uploadLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                ) : (
                  <Upload className="h-8 w-8 text-zinc-500" />
                )}
                <p className="mt-3 text-sm font-medium text-zinc-300">
                  {uploadLoading ? "Загрузка..." : "Нажмите для загрузки файла"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  CSV или TXT. Формат: имя, телефон (по одному на строку)
                </p>
              </div>
            </div>

            {/* Manual add */}
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-zinc-400">Имя</Label>
                <Input
                  placeholder="Имя контакта"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-zinc-400">
                  Телефон <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="+7 7XX XXX XX XX"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddContact();
                  }}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                />
              </div>
              <Button
                onClick={handleAddContact}
                disabled={addLoading}
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shrink-0"
              >
                {addLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Добавить
              </Button>
            </div>
            {addError && (
              <p className="text-sm text-red-400">{addError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contacts table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base text-white">
            <span>Контакты ({contacts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Users className="h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">
                Нет контактов. Загрузите файл или добавьте вручную.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Имя</TableHead>
                  <TableHead className="text-zinc-400">Телефон</TableHead>
                  <TableHead className="text-zinc-400">Статус</TableHead>
                  <TableHead className="text-zinc-400">Время звонка</TableHead>
                  <TableHead className="text-zinc-400">Заметки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const cs = contactStatusConfig[contact.status] || contactStatusConfig.PENDING;
                  const StatusIcon = cs.icon;
                  return (
                    <TableRow key={contact.id} className="border-zinc-800">
                      <TableCell className="text-zinc-300">
                        {contact.name || <span className="text-zinc-500">---</span>}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300">
                        {contact.phone}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cs.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cs.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDateTime(contact.calledAt)}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm max-w-[200px] truncate">
                        {contact.notes || "---"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
