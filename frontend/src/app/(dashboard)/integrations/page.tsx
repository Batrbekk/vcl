import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Camera,
  FileSpreadsheet,
  Blocks,
} from "lucide-react";

type IntegrationStatus = "connected" | "setup" | "soon";

interface Integration {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: IntegrationStatus;
  statusLabel: string;
}

const integrations: Integration[] = [
  {
    name: "WhatsApp Business",
    description: "Двусторонний обмен сообщениями с клиентами",
    icon: <MessageCircle className="h-6 w-6 text-green-400" />,
    status: "setup",
    statusLabel: "Настройка",
  },
  {
    name: "Instagram",
    description: "Получение DM и комментариев от клиентов",
    icon: <Camera className="h-6 w-6 text-pink-400" />,
    status: "connected",
    statusLabel: "Подключено",
  },
  {
    name: "Bitrix24",
    description: "Импорт и экспорт лидов, синхронизация CRM",
    icon: <Blocks className="h-6 w-6 text-blue-400" />,
    status: "soon",
    statusLabel: "Скоро",
  },
  {
    name: "1C Бухгалтерия",
    description: "Синхронизация контактов и сделок",
    icon: <FileSpreadsheet className="h-6 w-6 text-amber-400" />,
    status: "soon",
    statusLabel: "Скоро",
  },
];

const statusStyles: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  setup: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  soon: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Интеграции</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Подключение внешних сервисов
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                {integration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white">{integration.name}</h3>
                  <Badge variant="outline" className={`text-[10px] h-5 ${statusStyles[integration.status]}`}>
                    {integration.statusLabel}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{integration.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={integration.status === "soon"}
                className="shrink-0 border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-40"
              >
                {integration.status === "soon" ? "Скоро" : "Настроить"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
