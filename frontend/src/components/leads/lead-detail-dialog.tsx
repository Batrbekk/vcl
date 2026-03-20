"use client";

import { useState, useEffect } from "react";
import { type DemoLead } from "@/data/demo-leads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  Calendar,
  User,
  MessageSquare,
  Tag,
  Clock,
  Bot,
  MessageCircle,
  Instagram,
  Radio,
} from "lucide-react";

const sourceLabels: Record<DemoLead["source"], string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Сайт",
  phone: "Телефон",
  manual: "Вручную",
};

const sourceColors: Record<DemoLead["source"], string> = {
  whatsapp: "bg-green-500/20 text-green-400 border-green-500/30",
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  website: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  phone: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  manual: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const statusLabels: Record<DemoLead["status"], string> = {
  new: "Новый",
  qualified: "Квалифицирован",
  in_progress: "В работе",
  won: "Сделка",
  lost: "Отказ",
};

const channelConfig: Record<string, { label: string; icon: typeof Phone; colorClass: string }> = {
  PHONE: { label: "Телефон", icon: Phone, colorClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle, colorClass: "bg-green-500/20 text-green-400 border-green-500/30" },
  INSTAGRAM: { label: "Instagram", icon: Instagram, colorClass: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

type AssignmentType = "manager" | "bot";

interface BotOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

interface LeadDetailDialogProps {
  lead: DemoLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
}: LeadDetailDialogProps) {
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("manager");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBotId, setSelectedBotId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [bots, setBots] = useState<BotOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch users and bots when editing starts
  useEffect(() => {
    if (editingAssignment) {
      fetch("/api/team")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.users) {
            setUsers(data.users.map((u: any) => ({ id: u.id, name: u.name })));
          }
        })
        .catch(() => {});

      fetch("/api/bots")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.bots) {
            setBots(data.bots.map((b: any) => ({ id: b.id, name: b.name })));
          }
        })
        .catch(() => {});
    }
  }, [editingAssignment]);

  // Reset editing state when lead changes or dialog closes
  useEffect(() => {
    if (!open) {
      setEditingAssignment(false);
    }
    if (lead) {
      if (lead.assignedBotId) {
        setAssignmentType("bot");
        setSelectedBotId(lead.assignedBotId);
        setSelectedUserId("");
      } else if (lead.assignedTo) {
        setAssignmentType("manager");
        setSelectedUserId(lead.assignedTo);
        setSelectedBotId("");
      } else {
        setAssignmentType("manager");
        setSelectedUserId("");
        setSelectedBotId("");
      }
    }
  }, [lead, open]);

  const handleSaveAssignment = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (assignmentType === "manager") {
        body.assignedToId = selectedUserId || null;
        body.assignedBotId = null;
      } else {
        body.assignedBotId = selectedBotId || null;
        body.assignedToId = null;
      }

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingAssignment(false);
        onUpdated?.();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  const channel = lead.channel || "PHONE";
  const channelInfo = channelConfig[channel] || channelConfig.PHONE;
  const ChannelIcon = channelInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {lead.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Подробная информация о лиде
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-300">{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                <span className="text-zinc-300">{lead.email}</span>
              </div>
            )}

            {/* Assignment info */}
            {!editingAssignment && (
              <div className="flex items-center gap-3 text-sm">
                {lead.assignedBotName ? (
                  <>
                    <Bot className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="text-zinc-400">AI-бот:</span>
                    <span className="text-indigo-400 font-medium">{lead.assignedBotName}</span>
                  </>
                ) : lead.assignedToName ? (
                  <>
                    <User className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-zinc-400">Менеджер:</span>
                    <span className="text-zinc-300">{lead.assignedToName}</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 text-zinc-600 shrink-0" />
                    <span className="text-zinc-500">Не назначен</span>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAssignment(true)}
                  className="ml-auto h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Изменить
                </Button>
              </div>
            )}

            {/* Editing assignment */}
            {editingAssignment && (
              <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Radio className="h-3.5 w-3.5" />
                  <span>Назначение</span>
                </div>

                {/* Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType("manager");
                      setSelectedBotId("");
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                      assignmentType === "manager"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Менеджер
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType("bot");
                      setSelectedUserId("");
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                      assignmentType === "bot"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    AI-бот
                  </button>
                </div>

                {/* Select */}
                {assignmentType === "manager" ? (
                  <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
                    <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white text-xs h-8">
                      <SelectValue placeholder="Выберите менеджера" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="" className="text-zinc-400 text-xs">
                        Не назначен
                      </SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-zinc-200 text-xs">
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={selectedBotId} onValueChange={(v) => setSelectedBotId(v ?? "")}>
                    <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white text-xs h-8">
                      <SelectValue placeholder="Выберите бота" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {bots.length === 0 ? (
                        <SelectItem value="" disabled className="text-zinc-500 text-xs">
                          Нет ботов
                        </SelectItem>
                      ) : (
                        bots.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-zinc-200 text-xs">
                            {b.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingAssignment(false)}
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                    disabled={saving}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAssignment}
                    disabled={saving}
                    className="h-7 px-3 text-xs bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {saving ? "..." : "Сохранить"}
                  </Button>
                </div>
              </div>
            )}

            {/* Channel */}
            <div className="flex items-center gap-3 text-sm">
              <ChannelIcon className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Канал:</span>
              <Badge className={`border text-xs px-2 py-0.5 ${channelInfo.colorClass}`}>
                {channelInfo.label}
              </Badge>
            </div>
          </div>

          {/* Status & Source */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={`border text-xs px-2 py-0.5 ${sourceColors[lead.source]}`}
            >
              {sourceLabels[lead.source]}
            </Badge>
            <Badge className="border border-zinc-600 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5">
              {statusLabels[lead.status]}
            </Badge>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Tag className="h-3.5 w-3.5" />
                <span>Теги</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="border border-zinc-700 bg-zinc-800/80 text-zinc-400 text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Заметки</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">Последний контакт:</span>
              <span className="text-zinc-400">
                {formatDate(lead.lastContactAt)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">Создан:</span>
              <span className="text-zinc-400">
                {formatDate(lead.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
