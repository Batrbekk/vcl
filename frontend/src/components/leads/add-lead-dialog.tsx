"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bot, User } from "lucide-react";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: { id: string; name: string }[];
  users?: { id: string; name: string }[];
  pipelineId?: string;
  onCreated: () => void;
}

const sourceOptions = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WEBSITE", label: "Сайт" },
  { value: "PHONE", label: "Телефон" },
  { value: "MANUAL", label: "Вручную" },
];

const channelOptions = [
  { value: "PHONE", label: "Телефон" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
];

type AssignmentType = "manager" | "bot";

interface BotOption {
  id: string;
  name: string;
}

export function AddLeadDialog({
  open,
  onOpenChange,
  stages,
  users = [],
  pipelineId,
  onCreated,
}: AddLeadDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("MANUAL");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("manager");
  const [assignedToId, setAssignedToId] = useState("");
  const [assignedBotId, setAssignedBotId] = useState("");
  const [channel, setChannel] = useState("PHONE");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [bots, setBots] = useState<BotOption[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);

  // Fetch bots when dialog opens and assignment type is bot
  useEffect(() => {
    if (open) {
      setBotsLoading(true);
      fetch("/api/bots")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch bots");
          return res.json();
        })
        .then((data) => {
          if (data.bots && Array.isArray(data.bots)) {
            setBots(data.bots.map((b: any) => ({ id: b.id, name: b.name })));
          }
        })
        .catch(() => {
          setBots([]);
        })
        .finally(() => setBotsLoading(false));
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setSource("MANUAL");
    setStageId(stages[0]?.id ?? "");
    setAssignmentType("manager");
    setAssignedToId("");
    setAssignedBotId("");
    setChannel("PHONE");
    setNotes("");
    setTagsInput("");
    setError("");
    setPhoneError("");
  };

  const validatePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Имя обязательно");
      return;
    }
    if (!phone.trim()) {
      setError("Телефон обязателен");
      return;
    }
    if (!validatePhone(phone)) {
      setPhoneError("Неверный формат телефона");
      return;
    }
    setPhoneError("");
    if (!stageId) {
      setError("Выберите этап");
      return;
    }

    setLoading(true);
    setError("");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        source,
        stageId,
        pipelineId: pipelineId || "",
        tags,
        channel,
      };
      if (email.trim()) body.email = email.trim();
      if (notes.trim()) body.notes = notes.trim();

      if (assignmentType === "manager" && assignedToId) {
        body.assignedToId = assignedToId;
        body.assignedBotId = null;
      } else if (assignmentType === "bot" && assignedBotId) {
        body.assignedBotId = assignedBotId;
        body.assignedToId = null;
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Ошибка при создании лида");
      }

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Добавить лид
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Заполните информацию о новом лиде
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="lead-name" className="text-zinc-300">
              Имя <span className="text-red-400">*</span>
            </Label>
            <Input
              id="lead-name"
              placeholder="Введите имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="lead-phone" className="text-zinc-300">
              Телефон <span className="text-red-400">*</span>
            </Label>
            <Input
              id="lead-phone"
              placeholder="+7 7XX XXX XX XX"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
            {phoneError && (
              <p className="text-sm text-red-400">{phoneError}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="lead-email" className="text-zinc-300">
              Email
            </Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Источник</Label>
            <Select value={source} onValueChange={(v) => setSource(v ?? "MANUAL")}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-200">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Канал связи</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v ?? "PHONE")}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {channelOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-200">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Этап <span className="text-red-400">*</span>
            </Label>
            <Select value={stageId} onValueChange={(v) => setStageId(v ?? "")}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id} className="text-zinc-200">
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Type Toggle */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Ответственный</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignmentType("manager");
                  setAssignedBotId("");
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  assignmentType === "manager"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <User className="h-4 w-4" />
                Менеджер
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentType("bot");
                  setAssignedToId("");
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  assignmentType === "bot"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <Bot className="h-4 w-4" />
                AI-бот
              </button>
            </div>
          </div>

          {/* Manager Select */}
          {assignmentType === "manager" && users.length > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Менеджер</Label>
              <Select value={assignedToId} onValueChange={(v) => setAssignedToId(v ?? "")}>
                <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="" className="text-zinc-400">
                    Не назначен
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-zinc-200">
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bot Select */}
          {assignmentType === "bot" && (
            <div className="space-y-2">
              <Label className="text-zinc-300">AI-бот</Label>
              {botsLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка ботов...
                </div>
              ) : bots.length === 0 ? (
                <p className="text-sm text-zinc-500 py-2">
                  Нет доступных ботов. Создайте бота в разделе &quot;AI-бот&quot;.
                </p>
              ) : (
                <Select value={assignedBotId} onValueChange={(v) => setAssignedBotId(v ?? "")}>
                  <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
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
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="lead-notes" className="text-zinc-300">
              Заметки
            </Label>
            <Textarea
              id="lead-notes"
              placeholder="Дополнительная информация о лиде..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 min-h-[80px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="lead-tags" className="text-zinc-300">
              Теги
            </Label>
            <Input
              id="lead-tags"
              placeholder="VIP, срочно, недвижимость (через запятую)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
            <p className="text-xs text-zinc-500">Разделяйте теги запятыми</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="bg-zinc-900 border-zinc-800">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
