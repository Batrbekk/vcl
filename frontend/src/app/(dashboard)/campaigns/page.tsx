"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent } from "@/components/ui/card";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import {
  Plus,
  PhoneForwarded,
  Loader2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  totalContacts: number;
  completedCalls: number;
  botConfig: { id: string; name: string } | null;
  _count: { contacts: number };
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Черновик",
    className: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  },
  RUNNING: {
    label: "Идёт обзвон",
    className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse",
  },
  PAUSED: {
    label: "Пауза",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  COMPLETED: {
    label: "Завершена",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "янв", "фев", "мар", "апр", "май", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    fetch("/api/campaigns")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        if (data.campaigns) {
          setCampaigns(data.campaigns);
        }
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Удалить кампанию?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Ошибка удаления");
        return;
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Обзвон</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Массовый обзвон контактов с помощью AI-бота
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Создать кампанию
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <PhoneForwarded className="h-7 w-7 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white">
              Нет кампаний
            </h3>
            <p className="mt-2 text-sm text-zinc-400 text-center max-w-sm">
              Создайте первую кампанию обзвона, загрузите контакты и запустите
              автоматический обзвон с помощью AI-бота.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="mt-6 gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Создать кампанию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Название</TableHead>
                  <TableHead className="text-zinc-400">Бот</TableHead>
                  <TableHead className="text-zinc-400 text-center">Контакты</TableHead>
                  <TableHead className="text-zinc-400 text-center">Прогресс</TableHead>
                  <TableHead className="text-zinc-400">Статус</TableHead>
                  <TableHead className="text-zinc-400">Дата</TableHead>
                  <TableHead className="text-zinc-400 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const sc = statusConfig[campaign.status] || statusConfig.DRAFT;
                  const contactCount = campaign._count?.contacts ?? campaign.totalContacts;
                  const progress =
                    contactCount > 0
                      ? Math.round((campaign.completedCalls / contactCount) * 100)
                      : 0;

                  return (
                    <TableRow
                      key={campaign.id}
                      className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{campaign.name}</p>
                          {campaign.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">
                              {campaign.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {campaign.botConfig?.name || (
                          <span className="text-zinc-500">Не выбран</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-zinc-300">
                        {contactCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-zinc-300">
                          {campaign.completedCalls}/{contactCount}
                        </span>
                        {contactCount > 0 && (
                          <span className="ml-1.5 text-xs text-zinc-500">
                            ({progress}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={sc.className}
                        >
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(campaign.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleDelete(e, campaign.id)}
                          disabled={deletingId === campaign.id || campaign.status === "RUNNING"}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          {deletingId === campaign.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
