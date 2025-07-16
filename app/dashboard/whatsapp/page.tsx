"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWhatsAppStore } from "@/store/whatsapp-store"
import { useUserStore } from "@/store/user-store"
import { WhatsAppSessionManager } from "@/components/dashboard/whatsapp/session-manager"
import { WhatsAppChatView } from "@/components/dashboard/whatsapp/chat-view"
import { WhatsAppStats } from "@/components/dashboard/whatsapp/stats-view"
import { Plus, AlertCircle, Loader2, MessageCircle } from "lucide-react"

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("sessions")
  const {
    sessions,
    stats,
    isLoading,
    isConnected,
    currentSessionId,
    permissions,
    connectionStatus,
    initSocket,
    fetchSessions,
    fetchStats,
    createSession,
    stopPolling
  } = useWhatsAppStore()
  const { user } = useUserStore()

  // Инициализируем WebSocket при загрузке компонента
  useEffect(() => {
    console.log("Инициализация WhatsApp модуля...")
    initSocket()
    fetchSessions()
    fetchStats()

    // Cleanup при размонтировании
    return () => {
      console.log("Cleanup WhatsApp модуля...")
      stopPolling()
      // WebSocket будет отключен автоматически при размонтировании store
    }
  }, [initSocket, fetchSessions, fetchStats, stopPolling])

  // Периодически обновляем статистику
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        fetchStats()
      }
    }, 30000) // Каждые 30 секунд

    return () => clearInterval(interval)
  }, [isConnected, fetchStats])



  const handleCreateSession = async () => {
    const sessionId = await createSession()
    if (sessionId) {
      // Автоматически переключаемся на вкладку управления сессиями
      setActiveTab("sessions")
    }
  }

  const handleSessionSelect = () => {
    // Функция вызывается при ручном выборе сессии из session-manager
    console.log('📱 Сессия выбрана вручную')
  }

  const connectedSessions = (sessions || []).filter(session => session.isConnected)
  const todayMessages = stats?.messages?.today || 0

  const canManageSessions = user?.role === 'admin'
  const userRole = user?.role as 'admin' | 'manager' || 'manager'

  // Отладочное логирование
  useEffect(() => {
    console.log('🏠 WhatsAppPage: Состояние изменилось:', {
      currentSessionId,
      permissions,
      connectedSessions: connectedSessions.length,
      sessions: sessions?.length || 0,
      connectionStatus,
      isConnected,
      timestamp: new Date().toISOString(),
      connectedSessionsDetails: connectedSessions.map(s => ({
        id: s.id.slice(0, 8),
        phoneNumber: s.phoneNumber,
        displayName: s.displayName,
        isActive: s.isActive
      })),
      allSessionsDetails: (sessions || []).map(s => ({
        id: s.id.slice(0, 8),
        isConnected: s.isConnected,
        phoneNumber: s.phoneNumber,
        displayName: s.displayName,
        isActive: s.isActive
      }))
    })
  }, [currentSessionId, permissions, connectedSessions, sessions, connectionStatus, isConnected])

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <div className="flex items-center space-x-3">
          {/* Статус подключения WebSocket */}
          <div className="flex items-center space-x-2 text-sm">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-600">Offline</span>
              </>
            )}
          </div>
          
          {/* Статус текущей сессии */}
          {currentSessionId && (
            <Badge variant="outline">
              Активная сессия: {currentSessionId.slice(0, 8)}...
            </Badge>
          )}
          
          {canManageSessions && (
            <Button 
              onClick={handleCreateSession}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Создать сессию
            </Button>
          )}
        </div>
      </div>

      {/* Предупреждение если WebSocket не подключен */}
      {!isConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Нет соединения с сервером. Некоторые функции могут быть недоступны.
          </AlertDescription>
        </Alert>
      )}

      {/* Основной контент */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Управление</CardTitle>
          <CardDescription>
            Управляйте сессиями WhatsApp, настройками доступа и чатами в режиме реального времени
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions">
                Сессии
                {(sessions || []).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {(sessions || []).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chats" disabled={!isConnected || connectedSessions.length === 0}>
                Чаты
              </TabsTrigger>
              <TabsTrigger value="stats">
                Статистика
                {todayMessages > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    +{todayMessages}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-sm text-gray-500">Загрузка сессий...</span>
                </div>
              ) : (
                <WhatsAppSessionManager 
                  userRole={userRole}
                  onSessionSelect={handleSessionSelect}
                />
              )}
            </TabsContent>

            <TabsContent value="chats" className="space-y-4">
              {connectedSessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Нет подключенных сессий
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Подключитесь к WhatsApp сессии во вкладке &quot;Сессии&quot; для работы с чатами
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setActiveTab("sessions")}
                  >
                    Перейти к сессиям
                  </Button>
                </div>
              ) : (
                <WhatsAppChatView 
                  sessionId={currentSessionId || connectedSessions[0]?.id}
                  permissions={permissions || { canRead: true, canWrite: true, canManageChats: userRole === 'admin' }}
                />
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <WhatsAppStats stats={stats} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 