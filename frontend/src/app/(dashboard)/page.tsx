import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Users, Bot, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Пользователь";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Добро пожаловать, {userName}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Обзор активности вашей организации
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Всего лидов
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-xs text-zinc-500">Нет данных</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Звонки сегодня
            </CardTitle>
            <Phone className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-xs text-zinc-500">Нет данных</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              AI-бот активен
            </CardTitle>
            <Bot className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">--</div>
            <p className="mt-1 text-xs text-zinc-500">Не настроен</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Конверсия
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0%</div>
            <p className="mt-1 text-xs text-zinc-500">Нет данных</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-white">Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <a
              href="/leads"
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Users className="h-5 w-5 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Управление лидами</p>
                <p className="text-xs text-zinc-500">Kanban-доска лидов</p>
              </div>
            </a>
            <a
              href="/calls"
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Phone className="h-5 w-5 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">История звонков</p>
                <p className="text-xs text-zinc-500">Просмотр и анализ</p>
              </div>
            </a>
            <a
              href="/bot"
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Bot className="h-5 w-5 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Настройка AI-бота</p>
                <p className="text-xs text-zinc-500">Сценарии и промпты</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
