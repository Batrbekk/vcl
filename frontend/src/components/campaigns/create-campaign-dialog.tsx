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
import { Loader2 } from "lucide-react";

interface BotOption {
  id: string;
  name: string;
}

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaignId: string) => void;
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCampaignDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [botConfigId, setBotConfigId] = useState("");
  const [bots, setBots] = useState<BotOption[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setBotsLoading(true);
      fetch("/api/bots")
        .then((res) => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then((data) => {
          if (data.bots && Array.isArray(data.bots)) {
            setBots(data.bots.map((b: any) => ({ id: b.id, name: b.name })));
          }
        })
        .catch(() => setBots([]))
        .finally(() => setBotsLoading(false));
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setBotConfigId("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Название кампании обязательно");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          botConfigId: botConfigId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Ошибка при создании кампании");
      }

      const data = await res.json();
      resetForm();
      onOpenChange(false);
      onCreated(data.campaign.id);
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
            Создать кампанию
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Создайте кампанию обзвона и добавьте контакты
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-zinc-300">
              Название <span className="text-red-400">*</span>
            </Label>
            <Input
              id="campaign-name"
              placeholder="Например: Обзвон базы март 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="campaign-desc" className="text-zinc-300">
              Описание
            </Label>
            <Textarea
              id="campaign-desc"
              placeholder="Краткое описание кампании..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 min-h-[80px]"
            />
          </div>

          {/* Bot selector */}
          <div className="space-y-2">
            <Label className="text-zinc-300">AI-бот</Label>
            {botsLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка ботов...
              </div>
            ) : bots.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">
                Нет доступных ботов. Создайте бота в разделе &quot;AI-боты&quot;.
              </p>
            ) : (
              <Select value={botConfigId} onValueChange={(v) => setBotConfigId(v ?? "")}>
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
