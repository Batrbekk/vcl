"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BotSettings } from "@/components/bot/bot-settings";

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const botId = params.id as string;
  const defaultTab = searchParams.get("tab") === "test" ? 2 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/bot")}
          className="border-zinc-700 text-zinc-400 hover:text-white h-8"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Настройки бота</h2>
        </div>
      </div>
      <BotSettings botId={botId} defaultTab={defaultTab} />
    </div>
  );
}
