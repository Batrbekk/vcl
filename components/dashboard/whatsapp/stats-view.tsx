"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { WhatsAppStats } from "@/types/whatsapp"
import { 
  MessageCircle, 
  Users, 
  Wifi, 
  TrendingUp, 
  Calendar,
  Clock,
  Send,
  Inbox
} from "lucide-react"

interface StatsViewProps {
  stats: WhatsAppStats | null
}

export function WhatsAppStats({ stats }: StatsViewProps) {
  if (!stats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Статистика недоступна
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Данные статистики не найдены
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const connectionRate = (stats.sessions?.total || 0) > 0 
    ? ((stats.sessions?.connected || 0) / (stats.sessions?.total || 1)) * 100 
    : 0

  const inactiveSessions = (stats.sessions?.total || 0) - (stats.sessions?.connected || 0)

  const avgMessagesPerChat = (stats.chats?.total || 0) > 0 
    ? Math.round((stats.messages?.total || 0) / (stats.chats?.total || 1)) 
    : 0

  const sentToReceivedRatio = (stats.messages?.received || 0) > 0
    ? ((stats.messages?.sent || 0) / (stats.messages?.received || 1))
    : 0

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сессии</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessions?.total || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3 text-green-600" />
              <span>{stats.sessions?.connected || 0} активных</span>
              <span>•</span>
              <span>{stats.sessions?.active || 0} всего</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Чаты</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.chats?.individual || 0} личных, {stats.chats?.groups || 0} групп
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего сообщений</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.messages?.total || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {avgMessagesPerChat} в среднем на чат
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сегодня</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.messages?.today || 0).toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">Активность</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Статистика подключений */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>Подключения</span>
            </CardTitle>
            <CardDescription>
              Статистика подключенных WhatsApp сессий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Уровень подключения</span>
                <span className="font-medium">{connectionRate.toFixed(1)}%</span>
              </div>
              <Progress value={connectionRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">Подключено</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.sessions?.connected || 0}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-muted-foreground">Неактивно</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {inactiveSessions}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Всего активных</span>
                  <Badge variant="secondary">{stats.sessions?.active || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Менеджеров с доступом</span>
                  <Badge variant="outline">{stats.managers?.withAccess || 0}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Статистика сообщений */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Анализ сообщений</span>
            </CardTitle>
            <CardDescription>
              Входящие и исходящие сообщения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Inbox className="h-3 w-3 text-blue-500" />
                    <span>Входящие</span>
                  </span>
                  <span className="font-medium">
                    {(stats.messages?.received || 0).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(stats.messages?.total || 0) > 0 ? ((stats.messages?.received || 0) / (stats.messages?.total || 1)) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Send className="h-3 w-3 text-green-500" />
                    <span>Исходящие</span>
                  </span>
                  <span className="font-medium">
                    {(stats.messages?.sent || 0).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(stats.messages?.total || 0) > 0 ? ((stats.messages?.sent || 0) / (stats.messages?.total || 1)) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Соотношение исх./вх.</span>
                <Badge variant={sentToReceivedRatio > 0.5 ? "default" : "secondary"}>
                  {sentToReceivedRatio.toFixed(2)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Средние показатели */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Ключевые метрики</span>
            </CardTitle>
            <CardDescription>
              Производительность и активность
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Сообщений на чат</div>
                  <div className="text-xs text-muted-foreground">В среднем</div>
                </div>
                <div className="text-2xl font-bold">{avgMessagesPerChat}</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Чатов на сессию</div>
                  <div className="text-xs text-muted-foreground">В среднем</div>
                </div>
                <div className="text-2xl font-bold">
                  {(stats.sessions?.connected || 0) > 0 
                    ? Math.round((stats.chats?.total || 0) / (stats.sessions?.connected || 1)) 
                    : 0}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Сообщений сегодня</div>
                  <div className="text-xs text-muted-foreground">Активность</div>
                </div>
                <div className="text-2xl font-bold">
                  {stats.messages?.today || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Общий обзор */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Общий обзор</span>
            </CardTitle>
            <CardDescription>
              Краткая сводка по WhatsApp интеграции
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Активность сессий</span>
                <Badge variant={connectionRate > 50 ? "default" : "secondary"}>
                  {connectionRate > 75 ? "Высокая" : connectionRate > 25 ? "Средняя" : "Низкая"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Объем переписки</span>
                <Badge variant={(stats.messages?.today || 0) > 50 ? "default" : "secondary"}>
                  {(stats.messages?.today || 0) > 100 ? "Активная" : (stats.messages?.today || 0) > 10 ? "Умеренная" : "Низкая"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Тип чатов</span>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.chats?.individual || 0} личных
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {stats.chats?.groups || 0} групп
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Общее количество менеджеров</span>
                  <span className="font-medium">{stats.managers?.total || 0}</span>
                </div>
                <p>
                  {(stats.sessions?.connected || 0) > 0 
                    ? `${stats.sessions?.connected || 0} активных сессий обрабатывают ${stats.chats?.total || 0} чатов`
                    : "Нет активных сессий"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 