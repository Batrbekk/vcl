"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { useWhatsAppStore } from "@/store/whatsapp-store"
import { useManagerStore } from "@/store/managers-store"
import { WhatsAppSession, WhatsAppManagerAccess } from "@/types/whatsapp"
import { Wifi, QrCode, UserPlus, Trash2, Loader2, Users, Eye, Plus, MessageCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface SessionManagerProps {
  userRole: 'admin' | 'manager'
  onSessionSelect: (sessionId: string) => void
}

export function WhatsAppSessionManager({ userRole, onSessionSelect }: SessionManagerProps) {
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null)
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [manageAccessDialogOpen, setManageAccessDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [sessionToDisconnect, setSessionToDisconnect] = useState<WhatsAppSession | null>(null)
  const [selectedManager, setSelectedManager] = useState("")
  const [permissions, setPermissions] = useState<('read' | 'write')[]>(['read'])
  const [newSessionName, setNewSessionName] = useState("")
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [managerAccess, setManagerAccess] = useState<WhatsAppManagerAccess[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [isRefreshingQR, setIsRefreshingQR] = useState(false)

  const { 
    sessions,
    currentSessionId,
    isConnected,
    qrCode,
    disconnectSession, 
    grantManagerAccess, 
    revokeManagerAccess,
    fetchManagerAccess,
    createSession,
    joinSession,
    getQRCode,
    fetchSessions
  } = useWhatsAppStore()
  
  const { managers, fetchManagers } = useManagerStore()

  // Диагностика состояния для отладки QR-кода
  useEffect(() => {
    const disconnectedSession = sessions.find(session => session.isActive && !session.isConnected)
    console.log('🔍 Диагностика состояния QR-кода:', {
      userRole,
      hasQRCode: !!qrCode,
      qrCodeLength: qrCode?.length,
      sessionsCount: sessions.length,
      hasDisconnectedSession: !!disconnectedSession,
      disconnectedSessionId: disconnectedSession?.id,
      shouldShowQR: userRole === 'admin' && qrCode && sessions.some(session => session.isActive && !session.isConnected),
      allSessions: sessions.map(s => ({
        id: s.id.slice(0, 8),
        isActive: s.isActive,
        isConnected: s.isConnected,
        phoneNumber: s.phoneNumber
      }))
    })
  }, [userRole, qrCode, sessions])

  // Детальное логирование изменений сессий для диагностики
  useEffect(() => {
    console.log('📱 SessionManager: обновление сессий:', {
      sessionsCount: sessions.length,
      connectedSessions: sessions.filter(s => s.isConnected).length,
      activeSessions: sessions.filter(s => s.isActive).length,
      currentSessionId,
      isConnected,
      timestamp: new Date().toISOString(),
      sessions: sessions.map(s => ({
        id: s.id.slice(0, 8),
        isActive: s.isActive,
        isConnected: s.isConnected,
        phoneNumber: s.phoneNumber,
        displayName: s.displayName
      }))
    })
  }, [sessions, currentSessionId, isConnected])

  // Загружаем менеджеров только для админов
  useEffect(() => {
    if (userRole === 'admin') {
      fetchManagers()
    }
  }, [fetchManagers, userRole])

  // Периодическое обновление QR-кода для неподключенных сессий
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    // Найдем первую неподключенную активную сессию для получения QR-кода
    const disconnectedSession = sessions.find(session => 
      session.isActive && !session.isConnected
    )

    if (userRole === 'admin' && disconnectedSession) {
      console.log('🔄 Запускаем периодическое обновление QR-кода для неподключенной сессии:', disconnectedSession.id)
      
      // Сразу запрашиваем QR-код
      getQRCode(disconnectedSession.id)
      
      // Затем запрашиваем каждые 5 секунд как резервный механизм
      intervalId = setInterval(() => {
        console.log('🔄 Периодический запрос QR-кода для сессии:', disconnectedSession.id)
        getQRCode(disconnectedSession.id)
      }, 5000)
    }

    return () => {
      if (intervalId) {
        console.log('🔄 Останавливаем периодическое обновление QR-кода')
        clearInterval(intervalId)
      }
    }
  }, [userRole, sessions, getQRCode])

  // Ручное обновление QR-кода
  const handleRefreshQR = async () => {
    if (isRefreshingQR) return
    
    // Найдем первую неподключенную активную сессию
    const disconnectedSession = sessions.find(session => 
      session.isActive && !session.isConnected
    )
    
    if (!disconnectedSession) {
      toast.error('Нет неподключенных сессий для обновления QR-кода')
      return
    }
    
    setIsRefreshingQR(true)
    try {
      console.log('🔄 Ручное обновление QR-кода для сессии:', disconnectedSession.id)
      await getQRCode(disconnectedSession.id)
      toast.success('QR-код обновлен')
    } catch (error) {
      console.error('Ошибка обновления QR-кода:', error)
      toast.error('Не удалось обновить QR-код')
    } finally {
      setIsRefreshingQR(false)
    }
  }

  // Ручное обновление списка сессий
  const handleRefreshSessions = async () => {
    try {
      console.log('🔄 Ручное обновление списка сессий')
      await fetchSessions(false) // Явно указываем что это не тихий режим
      toast.success('Список сессий обновлен')
    } catch (error) {
      console.error('Ошибка обновления сессий:', error)
      toast.error('Не удалось обновить список сессий')
    }
  }

  // Создание новой сессии (только admin)
  const handleCreateSession = async () => {
    if (userRole !== 'admin') return
    
    setIsCreatingSession(true)
    try {
      const sessionId = await createSession(newSessionName || undefined)
      if (sessionId) {
        setNewSessionName("")
        toast.success('Сессия создана успешно')
      }
    } catch {
      toast.error('Ошибка создания сессии')
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Подключение к существующей сессии
  const handleJoinSession = async (sessionId: string) => {
    try {
      await joinSession(sessionId)
      onSessionSelect(sessionId)
      toast.success('Подключение к сессии выполнено')
    } catch {
      toast.error('Нет доступа к этой сессии')
    }
  }

  // Открытие диалога отключения
  const handleDisconnectClick = (session: WhatsAppSession) => {
    if (userRole !== 'admin') return
    setSessionToDisconnect(session)
    setDisconnectDialogOpen(true)
  }

  // Подтверждение отключения
  const handleConfirmDisconnect = async () => {
    if (!sessionToDisconnect) return
    
    await disconnectSession(sessionToDisconnect.id)
    setDisconnectDialogOpen(false)
    setSessionToDisconnect(null)
  }

  const loadManagerAccess = async (sessionId: string) => {
    setLoadingAccess(true)
    try {
      const access = await fetchManagerAccess(sessionId)
      setManagerAccess(access || [])
    } catch (error) {
      console.error("Ошибка загрузки доступов:", error)
      toast.error("Не удалось загрузить список доступов")
    } finally {
      setLoadingAccess(false)
    }
  }

  const handleManageAccess = async (session: WhatsAppSession) => {
    setSelectedSession(session)
    setManageAccessDialogOpen(true)
    await loadManagerAccess(session.id)
  }

  const handleGrantAccess = async () => {
    if (!selectedSession || !selectedManager) {
      toast.error("Выберите менеджера")
      return
    }

    await grantManagerAccess(selectedSession.id, selectedManager, permissions)
    
    setAccessDialogOpen(false)
    setSelectedManager("")
    setPermissions(['read'])
    
    // Обновляем список доступов если открыто окно управления
    if (manageAccessDialogOpen) {
      await loadManagerAccess(selectedSession.id)
    }
  }

  const handleRevokeAccess = async (sessionId: string, managerId: string) => {
    if (confirm("Вы уверены, что хотите отозвать доступ?")) {
      await revokeManagerAccess(sessionId, managerId)
      await loadManagerAccess(sessionId)
    }
  }

  return (
    <Card className="h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6" />
            <span>Управление сессиями WhatsApp</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshSessions}
            disabled={isRefreshingQR}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
        </CardTitle>
        <CardDescription>
          {userRole === 'admin' 
            ? 'Создавайте и управляйте WhatsApp сессиями, предоставляйте доступ менеджерам'
            : 'Подключайтесь к доступным WhatsApp сессиям'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Статус подключения */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-600">WebSocket подключен</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-red-600">WebSocket отключен</span>
              </>
            )}
          </div>
          {currentSessionId && (
            <Badge variant="outline">Активная сессия: {currentSessionId.slice(0, 8)}...</Badge>
          )}
        </div>

        {/* Кнопка создания новой сессии для админа */}
        {userRole === 'admin' && (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Название сессии (опционально)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                className="flex-1"
              />
              <Button 
                onClick={handleCreateSession}
                disabled={isCreatingSession}
              >
                {isCreatingSession ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Создать сессию
              </Button>
            </div>
          </div>
        )}

        {/* QR код для неподключенной сессии - только для админов */}
        {userRole === 'admin' && qrCode && sessions.some(session => session.isActive && !session.isConnected) && (
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium text-center mb-4">Сканируйте QR код в WhatsApp</h3>
            {(() => {
              const disconnectedSession = sessions.find(session => session.isActive && !session.isConnected)
              return disconnectedSession && (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Для сессии: <span className="font-medium">{disconnectedSession.displayName || disconnectedSession.id.slice(0, 8)}</span>
                </p>
              )
            })()}
            
            {/* Flex контейнер для QR-кода и инструкций */}
            <div className="flex items-start gap-6">
              {/* QR-код слева */}
              <div className="flex-shrink-0">
                <img 
                  key={qrCode}
                  src={qrCode}
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 border rounded-lg" 
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
              
              {/* Инструкции и кнопка справа */}
              <div className="flex-1 space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. Откройте WhatsApp на телефоне</p>
                  <p>2. Перейдите в Настройки → Связанные устройства</p>
                  <p>3. Нажмите &quot;Привязать устройство&quot;</p>
                  <p>4. Отсканируйте этот QR код</p>
                  <p className="font-medium text-yellow-600">⏰ QR код обновляется каждые 20-30 секунд</p>
                </div>
                
                <Button
                  variant="outline"
                  onClick={handleRefreshQR}
                  disabled={isRefreshingQR}
                >
                  {isRefreshingQR ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Обновить QR-код
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Список сессий */}
        <div className="space-y-4">
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Нет активных сессий
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {userRole === 'admin' 
                  ? 'Создайте первую WhatsApp сессию для начала работы'
                  : 'Обратитесь к администратору для создания сессии'
                }
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-green-100 text-green-600">
                      <MessageCircle className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">
                        {session.displayName || `Сессия ${session.id.slice(0, 8)}`}
                      </p>
                      {session.isConnected && (
                        <Badge variant="default" className="text-xs">
                          Подключено
                        </Badge>
                      )}
                      {session.isActive && !session.isConnected && (
                        <Badge variant="secondary" className="text-xs">
                          Ожидает подключения
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.phoneNumber || 'Номер не указан'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Если это текущая подключенная сессия - показываем badge */}
                  {currentSessionId === session.id ? (
                    <Badge variant="outline" className="flex items-center space-x-1 border-green-500 text-green-500 py-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span>Подключено</span>
                    </Badge>
                  ) : session.isConnected ? (
                    /* Если это не текущая сессия, но она подключена - показываем кнопку подключения */
                    <Button
                      variant="outline"
                      onClick={() => handleJoinSession(session.id)}
                    >
                      <Wifi className="mr-2 h-4 w-4" />
                      Подключиться
                    </Button>
                  ) : (
                    /* Если сессия не подключена - показываем кнопку получения QR-кода */
                    userRole === 'admin' && (
                      <Button
                        variant="outline"
                        onClick={() => getQRCode(session.id)}
                        disabled={isRefreshingQR}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Получить QR-код
                      </Button>
                    )
                  )}
                  
                  {userRole === 'admin' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageAccess(session)}
                        disabled={!session.isConnected}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Доступы
                      </Button>
                      
                      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSession(session)}
                            disabled={!session.isConnected}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Доступ
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnectClick(session)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Отключить
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Диалог подтверждения отключения */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отключить WhatsApp сессию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отключить эту сессию? Все активные подключения будут разорваны.
              {sessionToDisconnect?.displayName && (
                <span className="block mt-2 font-medium">
                  Сессия: {sessionToDisconnect.displayName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
            >
              Отключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог предоставления доступа */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Предоставить доступ менеджеру</DialogTitle>
            <DialogDescription>
              Выберите менеджера и настройте уровень доступа к сессии WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manager-select">Менеджер</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите менеджера" />
                </SelectTrigger>
                <SelectContent>
                  {(managers || []).map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <Label>Права доступа</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="read"
                    checked={permissions.includes('read')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPermissions(prev => [...prev, 'read'])
                      } else {
                        setPermissions(prev => prev.filter(p => p !== 'read'))
                      }
                    }}
                  />
                  <Label htmlFor="read" className="text-sm">
                    Чтение сообщений
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="write"
                    checked={permissions.includes('write')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPermissions(prev => [...prev, 'write'])
                      } else {
                        setPermissions(prev => prev.filter(p => p !== 'write'))
                      }
                    }}
                  />
                  <Label htmlFor="write" className="text-sm">
                    Отправка сообщений
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setAccessDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleGrantAccess}>
              Предоставить доступ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог управления доступами */}
      <Dialog open={manageAccessDialogOpen} onOpenChange={setManageAccessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Управление доступами к сессии</DialogTitle>
            <DialogDescription>
              Просмотр и управление доступами менеджеров к WhatsApp сессии
              {selectedSession?.displayName && ` "${selectedSession.displayName}"`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingAccess ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Загрузка...</span>
              </div>
            ) : managerAccess.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Нет предоставленных доступов
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Используйте кнопку &quot;Доступ&quot; для предоставления прав менеджерам
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {managerAccess.map((access) => (
                  <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {access.manager.firstName} {access.manager.lastName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({access.manager.email})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {access.canRead && (
                          <Badge variant="secondary" className="text-xs">
                            Чтение
                          </Badge>
                        )}
                        {access.canWrite && (
                          <Badge variant="secondary" className="text-xs">
                            Запись
                          </Badge>
                        )}
                        {access.canManageChats && (
                          <Badge variant="secondary" className="text-xs">
                            Управление чатами
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Предоставлен: {new Date(access.grantedAt).toLocaleDateString()} 
                        {access.grantedByUser && ` пользователем ${access.grantedByUser.firstName} ${access.grantedByUser.lastName}`}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeAccess(access.sessionId, access.managerId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 