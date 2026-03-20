"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, Plus, Star, Trash2, FlaskConical, Settings, Loader2, MoreVertical,
} from "lucide-react";

interface BotConfig {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  greeting: string;
  voiceId: string | null;
  voiceName: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export function BotManager() {
  const router = useRouter();
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDesc, setNewBotDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      if (data.bots) setBots(data.bots);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBots(); }, []);

  const handleCreate = async () => {
    if (!newBotName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBotName,
          description: newBotDesc || null,
          prompt: "Ты AI-ассистент компании. Говори на русском. Отвечай кратко и профессионально. Порядок: 1) узнай имя 2) тип интереса 3) бюджет 4) сроки 5) предложи встречу.",
          greeting: "[clearing throat] Здравствуйте! [short pause] Чем могу помочь?",
        }),
      });
      const data = await res.json();
      if (data.bot) {
        setBots((prev) => [...prev, data.bot]);
        setCreateOpen(false);
        setNewBotName("");
        setNewBotDesc("");
      }
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить этого бота?")) return;
    try {
      const res = await fetch(`/api/bots/${id}`, { method: "DELETE" });
      if (res.ok) setBots((prev) => prev.filter((b) => b.id !== id));
    } catch {}
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/bots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      setBots((prev) => prev.map((b) => ({ ...b, isDefault: b.id === id })));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">{bots.length} из 10 ботов</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          Создать бота
        </Button>
      </div>

      {/* Table */}
      {bots.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Нет ботов</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md">
              Создайте первого AI-ассистента для автоматизации звонков.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-1.5" /> Создать бота
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500">Имя</TableHead>
                <TableHead className="text-zinc-500">Описание</TableHead>
                <TableHead className="text-zinc-500">Голос</TableHead>
                <TableHead className="text-zinc-500">Статус</TableHead>
                <TableHead className="text-zinc-500 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.map((bot) => (
                <TableRow
                  key={bot.id}
                  onClick={() => router.push(`/bot/${bot.id}`)}
                  className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/15">
                        <Bot className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-zinc-200 truncate">{bot.name}</span>
                          {bot.isDefault && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-500 truncate block max-w-[200px]">
                      {bot.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-400">{bot.voiceName || "Стандартный"}</span>
                  </TableCell>
                  <TableCell>
                    {bot.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                        Активен
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                        Отключён
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/bot/${bot.id}?tab=test`);
                        }}
                        className="h-7 px-2 border-zinc-700 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/30"
                      >
                        <FlaskConical className="h-3.5 w-3.5 mr-1" />
                        Тест
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/bot/${bot.id}`);
                        }}
                        className="h-7 px-2 border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      {!bot.isDefault && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleSetDefault(bot.id, e)}
                            className="h-7 px-2 border-zinc-700 text-zinc-400 hover:text-amber-400"
                            title="Сделать основным"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDelete(bot.id, e)}
                            className="h-7 px-2 border-zinc-700 text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="!max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Новый бот</DialogTitle>
            <DialogDescription className="text-zinc-400">Создайте нового AI-ассистента</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Имя бота</Label>
              <Input value={newBotName} onChange={(e) => setNewBotName(e.target.value)} placeholder="Например: Алия — продажи" className="border-zinc-700 bg-zinc-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Описание</Label>
              <Textarea value={newBotDesc} onChange={(e) => setNewBotDesc(e.target.value)} placeholder="Квалификация лидов..." rows={2} className="border-zinc-700 bg-zinc-800 text-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1 border-zinc-700">Отмена</Button>
              <Button onClick={handleCreate} disabled={!newBotName.trim() || creating} className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
