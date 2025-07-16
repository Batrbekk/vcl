import { create } from 'zustand'
import { toast } from 'sonner'
import { Socket } from 'socket.io-client'
import { useAuthStore } from './auth-store'
import { whatsappSocketService, SocketErrorHandlers } from '@/lib/whatsapp-socket'
import { 
  WhatsAppSession, 
  WhatsAppChat, 
  WhatsAppMessage, 
  WhatsAppManagerAccess, 
  WhatsAppStats,
  ApiResponse,
  PaginationResponse,
  CreateSessionRequest,
  ManagerAccessRequest,
  LocalMessage,
  MessageStatus,
  UserPermissions,
  GetChatsOptions
} from '@/types/whatsapp'

interface WhatsAppStore {
  // WebSocket состояние
  socket: Socket | null
  isConnected: boolean
  currentSessionId: string | null
  currentChatId: string | null // Добавляем отслеживание текущего чата
  permissions: UserPermissions | null
  
  // Основные данные
  sessions: WhatsAppSession[]
  chats: WhatsAppChat[]
  messages: WhatsAppMessage[]
  stats: WhatsAppStats | null
  
  // UI состояние
  isLoading: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'waiting'
  qrCode: string | null
  
  // Локальные сообщения для оптимистичных обновлений
  localMessages: LocalMessage[]
  
  // Пагинация
  chatsPagination: PaginationResponse<WhatsAppChat>['pagination'] | null
  messagesPagination: PaginationResponse<WhatsAppMessage>['pagination'] | null

  // WebSocket методы
  initSocket: () => void
  disconnectSocket: () => void
  joinSession: (sessionId: string, isAutomatic?: boolean) => Promise<void>
  leaveSession: (sessionId: string) => Promise<void>
  
  // REST + WebSocket гибридные методы
  fetchSessions: (silent?: boolean) => Promise<void>
  createSession: (displayName?: string) => Promise<string | null>
  disconnectSession: (sessionId: string) => Promise<void>
  
  // Методы чатов и сообщений (через WebSocket)
  fetchChats: (sessionId: string, options?: GetChatsOptions) => Promise<void>
  fetchMessages: (sessionId: string, chatId: string, page?: number, limit?: number) => Promise<void>
  sendMessage: (sessionId: string, chatId: string, message: string) => Promise<void>
  
  // Управление доступами менеджеров (REST)
  grantManagerAccess: (sessionId: string, managerId: string, permissions: ('read' | 'write')[]) => Promise<void>
  revokeManagerAccess: (sessionId: string, managerId: string) => Promise<void>
  fetchManagerAccess: (sessionId: string) => Promise<WhatsAppManagerAccess[]>
  
  // Статистика
  fetchStats: () => Promise<void>
  
  // Вспомогательные методы
  addMessage: (message: WhatsAppMessage) => void
  addLocalMessage: (message: LocalMessage) => void
  updateMessageStatus: (messageId: string, status: MessageStatus) => void
  removeLocalMessage: (localId: string) => void
  replaceLocalMessageWithReal: (localMessage: LocalMessage, realMessage: WhatsAppMessage) => void
  cleanupOldLocalMessages: () => void
  updateChatUnreadCount: (chatId: string, count: number) => void
  markChatAsRead: (sessionId: string, chatId: string) => Promise<void>
  setCurrentChat: (chatId: string | null) => void // Новый метод для установки текущего чата
  
  // QR код
  getQRCode: (sessionId: string) => Promise<{ qrCode: string; isConnected: boolean } | null>
  
  // Polling для резервной проверки
  startPolling: () => void
  stopPolling: () => void
  
  // Отладка
  debugState: () => WhatsAppStore
  
  // Cleanup
  reset: () => void
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

// Глобальный интервал для polling
let pollingInterval: NodeJS.Timeout | null = null

export const useWhatsAppStore = create<WhatsAppStore>((set, get) => ({
  // Начальное состояние
  socket: null,
  isConnected: false,
  currentSessionId: null,
  currentChatId: null, // Добавляем начальное состояние
  permissions: null,
  sessions: [],
  chats: [],
  messages: [],
  stats: null,
  isLoading: false,
  connectionStatus: 'disconnected',
  qrCode: null,
  localMessages: [],
  chatsPagination: null,
  messagesPagination: null,

  // WebSocket методы
  initSocket: () => {
    const state = get()
    if (state.socket?.connected) {
      console.log('🔄 WebSocket уже подключен, обновляем состояние')
      set({ isConnected: true, connectionStatus: 'connected' })
      
      // Загружаем сессии сразу после подключения (с loader для первого раза)
      setTimeout(() => {
        console.log('🔄 Первоначальная загрузка сессий после подключения сокета')
        get().fetchSessions(false) // Обычный режим с loader
      }, 500)
      return
    }

    console.log('Инициализация WebSocket подключения для WhatsApp namespace...')
    
    const token = useAuthStore.getState().token
    if (!token) {
      console.error('Нет токена для WebSocket подключения')
      toast.error('Ошибка авторизации WebSocket')
      return
    }

    try {
      // Создаем обработчики ошибок
      const errorHandlers: SocketErrorHandlers = {
        onConnectionError: (error: Error, errorType: 'timeout' | 'connection_failed' | 'auth_error' | 'unknown') => {
          console.error('Ошибка WebSocket подключения:', error)
          set({ isConnected: false, connectionStatus: 'disconnected' })
          
          // Показываем соответствующее уведомление в зависимости от типа ошибки
          switch (errorType) {
            case 'timeout':
              toast.error('Не удалось подключиться к WhatsApp: превышено время ожидания')
              break
            case 'connection_failed':
              toast.error('Не удалось подключиться к WhatsApp: ошибка соединения')
              break
            case 'auth_error':
              toast.error('Не удалось подключиться к WhatsApp: ошибка авторизации')
              break
            default:
              toast.error('Не удалось подключиться к WhatsApp')
              break
          }
        },
        onDisconnect: (reason: string) => {
          console.log('WhatsApp WebSocket отключен от namespace /whatsapp, причина:', reason)
          set({ isConnected: false, connectionStatus: 'disconnected' })
          
          // Показываем уведомление только если отключение не было инициировано пользователем
          if (reason !== 'io client disconnect' && reason !== 'client namespace disconnect') {
            toast.warning('Соединение с WhatsApp потеряно')
          }
        }
      }

      const socket = whatsappSocketService.connect(token, errorHandlers)
      
      // Подписываемся на события соединения
      socket.on('connect', () => {
        console.log('✅ WhatsApp WebSocket подключен к namespace /whatsapp')
        const wasDisconnected = !get().isConnected
        set({ isConnected: true, connectionStatus: 'connected' })
        console.log('✅ Состояние isConnected обновлено на true')
        
        // Показываем уведомление только при восстановлении связи, не при первом подключении
        if (wasDisconnected && get().socket) {
          toast.success('Подключение к WhatsApp восстановлено')
        }
        
        // Автоматически загружаем сессии после подключения (с loader для первого раза)
        setTimeout(() => {
          console.log('🔄 Первоначальная загрузка сессий после подключения WebSocket')
          get().fetchSessions(false) // Обычный режим с loader
        }, 1000)
      })

      // Проверяем текущее состояние сокета
      console.log('🔍 Состояние сокета после подключения:', {
        connected: socket.connected,
        id: socket.id
      })

      // Если сокет уже подключен, сразу обновляем состояние
      if (socket.connected) {
        console.log('✅ Сокет уже подключен, обновляем состояние немедленно')
        set({ isConnected: true, connectionStatus: 'connected' })
        
        // Загружаем сессии сразу после подключения (с loader для первого раза) 
        setTimeout(() => {
          console.log('🔄 Первоначальная загрузка сессий после подключения сокета')
          get().fetchSessions(false) // Обычный режим с loader
        }, 500)
      }

      set({ socket })
      
      // Отладочный таймер для проверки состояния
      setTimeout(() => {
        const currentState = get()
        console.log('🔍 Состояние через 2 секунды:', {
          isConnected: currentState.isConnected,
          socketConnected: currentState.socket?.connected,
          connectionStatus: currentState.connectionStatus,
          sessionsCount: currentState.sessions.length
        })
      }, 2000)

      // Запускаем polling для проверки статуса сессий
      get().startPolling()

      // Подписываемся на WhatsApp события
      whatsappSocketService.onNewMessage((data) => {
        console.log('Новое сообщение через WebSocket:', data)
        console.log('🔍 Структура данных сообщения:', {
          hasChat: !!data.chat,
          hasMessage: !!data.message,
          sessionId: data.sessionId,
          messageSessionId: data.message?.sessionId,
          chatId: data.chat?.id,
          messageChatId: data.message?.chatId
        })
        const { chat, message } = data
        
        // Обновляем чат в списке
        set((state) => {
          const updatedChats = state.chats.map(c => 
            c.id === chat.id 
              ? { ...c, lastMessageAt: chat.lastMessageAt, lastMessageText: chat.lastMessageText, unreadCount: chat.unreadCount }
              : c
          )
          return { chats: updatedChats }
        })
        
        // Добавляем сообщение если это текущая сессия
        const currentState = get()
        const currentSessionId = currentState.currentSessionId
        const currentChatId = currentState.currentChatId
        
        console.log('🔍 Проверка состояния для добавления сообщения:', {
          currentSessionId,
          dataSessionId: data.sessionId,
          messageSessionId: message.sessionId,
          currentChatId,
          chatId: chat.id,
          messageChatId: message.chatId,
          messageText: message.body.substring(0, 50) + '...'
        })
        
        if (currentSessionId && data.sessionId === currentSessionId) {
          // Проверяем, есть ли локальное сообщение с таким же текстом и chatId (отправленное нами)
          const matchingLocalMessage = currentState.localMessages.find(local => 
            local.chatId === chat.id && 
            local.body === message.body && 
            local.fromMe === message.fromMe &&
            (local.status === 'sent' || local.status === 'sending')
          )
          
          if (matchingLocalMessage) {
            console.log('✅ Заменяем локальное сообщение на реальное')
            // Заменяем локальное сообщение на реальное
            get().replaceLocalMessageWithReal(matchingLocalMessage, message)
          } else {
            // Добавляем как новое сообщение если это текущий открытый чат
            if (currentChatId === chat.id) {
              console.log('✅ Добавляем сообщение в текущий открытый чат')
              get().addMessage(message)
              
              // Автоматически отмечаем новое входящее сообщение как прочитанное, если чат открыт
              if (!message.fromMe && chat.unreadCount > 0) {
                console.log('🔄 Автоматически отмечаем новое сообщение как прочитанное')
                // Используем setTimeout чтобы дать время обновиться состоянию чата
                setTimeout(() => {
                  get().markChatAsRead(data.sessionId, chat.id)
                }, 100)
              }
            } else {
              console.log('ℹ️ Сообщение не добавлено: чат не открыт', {
                currentChatId,
                chatId: chat.id
              })
            }
          }
        } else {
          console.log('ℹ️ Сообщение пропущено: не текущая сессия', {
            currentSessionId,
            dataSessionId: data.sessionId
          })
        }
      })

      whatsappSocketService.onChatsUpdated((data) => {
        console.log('Чаты обновлены через WebSocket:', data)
        const currentSessionId = get().currentSessionId
        if (currentSessionId && data.sessionId === currentSessionId) {
          // Перезагружаем чаты для текущей сессии
          get().fetchChats(currentSessionId)
        }
      })

      whatsappSocketService.onChatUpdated((data) => {
        console.log('Чат обновлен через WebSocket:', data)
        const currentSessionId = get().currentSessionId
        if (currentSessionId && data.sessionId === currentSessionId && data.chat) {
          // Обновляем конкретный чат
          set((state) => {
            const updatedChats = state.chats.map(c => 
              c.id === data.chat.id ? { ...c, ...data.chat } : c
            )
            return { chats: updatedChats }
          })
        }
      })

      whatsappSocketService.onSessionStatus((data) => {
        console.log('🔄 Статус сессии обновлен через WebSocket:', data)
        console.log('🔍 Детали события статуса:', {
          sessionId: data.sessionId,
          status: data.status,
          isConnected: data.isConnected,
          phoneNumber: data.phoneNumber,
          displayName: data.displayName,
          hasQrCode: !!data.qrCode,
          qrCodeLength: data.qrCode?.length,
          timestamp: new Date().toISOString()
        })
        
        // Логируем текущее состояние store перед обновлением
        const currentState = get()
        console.log('📊 Текущее состояние store перед обновлением:', {
          sessionsCount: currentState.sessions.length,
          currentSessions: currentState.sessions.map(s => ({
            id: s.id,
            isConnected: s.isConnected,
            phoneNumber: s.phoneNumber,
            displayName: s.displayName
          }))
        })
        
        // Обновляем QR код если ожидаем его
        if (data.qrCode) {
          console.log('🔄 Обновляем QR код через WebSocket. Длина:', data.qrCode.length)
          set({ qrCode: data.qrCode, connectionStatus: 'waiting' })
        }
        
        // Обновляем информацию о сессии
        set((state) => {
          const updatedSessions = state.sessions.map(session =>
            session.id === data.sessionId 
              ? { 
                  ...session, 
                  isConnected: data.isConnected || false,
                  phoneNumber: data.phoneNumber || session.phoneNumber,
                  displayName: data.displayName || session.displayName
                }
              : session
          )
          
          console.log('🔄 Обновляем сессии в store:', {
            sessionId: data.sessionId,
            oldSessions: state.sessions.length,
            newSessions: updatedSessions.length,
            updatedSession: updatedSessions.find(s => s.id === data.sessionId),
            changedSessions: updatedSessions.filter((session, index) => {
              const oldSession = state.sessions[index]
              return !oldSession || 
                     oldSession.isConnected !== session.isConnected || 
                     oldSession.phoneNumber !== session.phoneNumber
            })
          })
          
          return { sessions: updatedSessions }
        })

        if (data.isConnected) {
          console.log('✅ Сессия подключена, очищаем QR код и обновляем статус')
          set({ connectionStatus: 'connected', qrCode: null }) // Очищаем QR при подключении
          toast.success(`WhatsApp подключен: ${data.phoneNumber}`)
          
          // Тихо обновляем список сессий для получения актуальной информации
          console.log('🔄 Тихое обновление списка сессий после подключения через WebSocket')
          get().fetchSessions(true) // Тихий режим, так как уже есть toast уведомление
          
          // Логируем результат обновления через 1 секунду
          setTimeout(() => {
            const afterUpdateState = get()
            console.log('📊 Состояние после обновления сессий:', {
              sessionsCount: afterUpdateState.sessions.length,
              connectedSessions: afterUpdateState.sessions.filter(s => s.isConnected).length,
              targetSession: afterUpdateState.sessions.find(s => s.id === data.sessionId),
              allSessions: afterUpdateState.sessions.map(s => ({
                id: s.id.slice(0, 8),
                connected: s.isConnected,
                phone: s.phoneNumber
              }))
            })
          }, 1000)
        }

        // Дополнительный fallback: если статус "connected" но сессия не обновилась, 
        // принудительно обновляем через 2 секунды
        if (data.isConnected) {
          setTimeout(() => {
            const currentState = get()
            const session = currentState.sessions.find(s => s.id === data.sessionId)
            
            console.log('🔍 Fallback проверка через 2 секунды:', {
              sessionFound: !!session,
              sessionConnected: session?.isConnected,
              hasPhoneNumber: !!session?.phoneNumber,
              phoneNotPending: session?.phoneNumber !== 'pending',
              needsUpdate: !session || !session.isConnected || session.phoneNumber === 'pending'
            })
            
            if (!session || !session.isConnected || session.phoneNumber === 'pending') {
              console.log('🔄 Fallback: тихое обновление сессий через 2 секунды')
              get().fetchSessions(true) // Тихий режим для fallback
            } else {
              console.log('✅ Fallback: сессия корректно обновлена, дополнительное обновление не требуется')
            }
          }, 2000)
        }
      })

    } catch (error) {
      console.error('Ошибка инициализации WebSocket:', error)
      set({ connectionStatus: 'disconnected' })
      toast.error('Не удалось инициализировать подключение к WhatsApp')
    }
  },

  disconnectSocket: () => {
    const state = get()
    if (state.socket) {
      whatsappSocketService.disconnect()
      set({ 
        socket: null, 
        isConnected: false, 
        connectionStatus: 'disconnected',
        currentSessionId: null,
        permissions: null 
      })
    }
  },

  joinSession: async (sessionId: string, isAutomatic = false) => {
    try {
      set({ isLoading: true, connectionStatus: 'connecting' })
      
      const result = await whatsappSocketService.joinSession(sessionId)
      
      set({ 
        currentSessionId: sessionId,
        permissions: result.permissions,
        connectionStatus: 'connected'
      })
      
      console.log('Успешно подключились к сессии:', sessionId, 'с правами:', result.permissions)
      
      // Показываем уведомление только при автоматическом подключении
      if (isAutomatic) {
        toast.success(`Автоматически подключено к WhatsApp сессии`, {
          description: `Сессия: ${sessionId.slice(0, 8)}...`
        })
      }
      
    } catch (error) {
      console.error('Ошибка подключения к сессии:', error)
      set({ connectionStatus: 'disconnected' })
      
      // Более информативные сообщения об ошибках
      let errorMessage = 'Ошибка подключения к сессии'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Не удалось подключиться к сессии: превышено время ожидания'
        } else if (error.message.includes('WebSocket не подключен')) {
          errorMessage = 'Нет соединения с сервером WhatsApp'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  leaveSession: async (sessionId: string) => {
    try {
      await whatsappSocketService.leaveSession(sessionId)
      
      set({ 
        currentSessionId: null,
        currentChatId: null, // Сбрасываем текущий чат
        permissions: null,
        chats: [],
        messages: [],
        localMessages: []
      })
      
      console.log('Отключились от сессии:', sessionId)
      
    } catch (error) {
      console.error('Ошибка отключения от сессии:', error)
      
      let errorMessage = 'Ошибка отключения от сессии'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Не удалось отключиться от сессии: превышено время ожидания'
        } else if (error.message.includes('WebSocket не подключен')) {
          errorMessage = 'Нет соединения с сервером WhatsApp'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    }
  },

  // REST API методы для управления сессиями
  fetchSessions: async (silent = false) => {
    try {
      // Показываем loader только если это не тихий запрос
      if (!silent) {
        set({ isLoading: true })
      }
      
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при получении сессий WhatsApp')
      }
      
      const result: ApiResponse<WhatsAppSession[]> = await response.json()
      
      if (result.success && result.data) {
        const currentState = get()
        const currentSessions = currentState.sessions
        
        // Проверяем, действительно ли изменились статусы подключения
        const hasStatusChanges = result.data.some(newSession => {
          const existingSession = currentSessions.find(s => s.id === newSession.id)
          return !existingSession || 
                 existingSession.isConnected !== newSession.isConnected ||
                 existingSession.isActive !== newSession.isActive ||
                 existingSession.phoneNumber !== newSession.phoneNumber ||
                 existingSession.displayName !== newSession.displayName
        }) || currentSessions.length !== result.data.length
        
        // Обновляем состояние только если есть реальные изменения
        if (hasStatusChanges) {
          set({ sessions: result.data })
          
          if (!silent) {
            console.log('✅ Обнаружены изменения в сессиях, состояние обновлено')
            
            // Детальное логирование изменений
            const changes = result.data.map(newSession => {
              const existingSession = currentSessions.find(s => s.id === newSession.id)
              if (!existingSession) {
                return { id: newSession.id.slice(0, 8), change: 'новая сессия' }
              }
              const changes = []
              if (existingSession.isConnected !== newSession.isConnected) {
                changes.push(`подключение: ${existingSession.isConnected} → ${newSession.isConnected}`)
              }
              if (existingSession.isActive !== newSession.isActive) {
                changes.push(`активность: ${existingSession.isActive} → ${newSession.isActive}`)
              }
              if (existingSession.phoneNumber !== newSession.phoneNumber) {
                changes.push(`номер: ${existingSession.phoneNumber || 'null'} → ${newSession.phoneNumber || 'null'}`)
              }
              if (existingSession.displayName !== newSession.displayName) {
                changes.push(`имя: ${existingSession.displayName || 'null'} → ${newSession.displayName || 'null'}`)
              }
              return changes.length > 0 ? { id: newSession.id.slice(0, 8), change: changes.join(', ') } : null
            }).filter(Boolean)
            
            if (changes.length > 0) {
              console.log('🔄 Детали изменений в сессиях:', changes)
            }
          } else {
            console.log('🔇 Тихое обновление: обнаружены изменения в сессиях')
          }
          
          // Автоматическое подключение к активной сессии
          if (currentState.isConnected && !currentState.currentSessionId) {
            const activeSession = result.data.find(session => session.isConnected && session.isActive)
            if (activeSession && !silent) {
              console.log('🔗 Автоматическое подключение к активной сессии:', activeSession.id)
              set({ currentSessionId: activeSession.id })
            }
          }
        } else if (!silent) {
          console.log('📋 Изменений в сессиях не обнаружено')
        }
      }
    } catch (error) {
      console.error('❌ Ошибка получения сессий:', error)
      if (!silent) {
        toast.error('Не удалось загрузить сессии WhatsApp')
      }
    } finally {
      // Убираем loader только если это не тихий запрос
      if (!silent) {
        set({ isLoading: false })
      }
    }
  },

  createSession: async (displayName = 'WhatsApp Session') => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      const requestData: CreateSessionRequest = { displayName }
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Ошибка при создании сессии')
      }
      
      const result: ApiResponse<{ sessionId: string }> = await response.json()
      
      if (result.success && result.data) {
        toast.success('Сессия WhatsApp создана')
        await get().fetchSessions()
        return result.data.sessionId
      }
      
      return null
    } catch (error: unknown) {
      console.error('Ошибка создания сессии:', error)
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать сессию WhatsApp'
      toast.error(errorMessage)
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  disconnectSession: async (sessionId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions/${sessionId}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при отключении сессии')
      }
      
      const result: ApiResponse<void> = await response.json()
      
      if (result.success) {
        toast.success('Сессия WhatsApp отключена')
        await get().fetchSessions()
        
        // Если это была текущая сессия, отключаемся от неё
        if (get().currentSessionId === sessionId) {
          await get().leaveSession(sessionId)
        }
      }
    } catch (error) {
      console.error('Ошибка отключения сессии:', error)
      toast.error('Не удалось отключить сессию')
    }
  },

  // WebSocket методы для чатов и сообщений
  fetchChats: async (sessionId: string, options: GetChatsOptions = {}) => {
    try {
      const defaultOptions: GetChatsOptions = {
        page: 1,
        limit: 50,
        includeGroups: false,
        includeStatus: false,
        chatType: 'individual',
        ...options
      }

      console.log('🔄 Загружаем чаты через WebSocket для сессии:', sessionId, 'с параметрами:', defaultOptions)
      
      // Очищаем старые локальные сообщения при загрузке чатов
      get().cleanupOldLocalMessages()
      
      const result = await whatsappSocketService.getChats(sessionId, defaultOptions)
      
      console.log('✅ Получены чаты через WebSocket, количество:', result.chats.length)
      set({ 
        chats: result.chats,
        chatsPagination: result.pagination
      })
      
    } catch (error) {
      console.error('❌ Ошибка получения чатов через WebSocket:', error)
      
      let errorMessage = 'Не удалось загрузить чаты'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Не удалось загрузить чаты: превышено время ожидания'
        } else if (error.message.includes('WebSocket не подключен')) {
          errorMessage = 'Нет соединения с сервером WhatsApp'
        }
      }
      
      toast.error(errorMessage)
    }
  },

  fetchMessages: async (sessionId: string, chatId: string, page = 1, limit = 50) => {
    try {
      set({ isLoading: true })
      
      console.log('🔄 Загружаем сообщения через WebSocket для чата:', chatId)
      
      // Устанавливаем текущий чат
      set({ currentChatId: chatId })
      console.log('✅ Текущий чат установлен:', chatId)
      
      const result = await whatsappSocketService.getMessages(sessionId, chatId, page, limit)
      
      console.log('✅ Получены сообщения через WebSocket, количество:', result.messages.length)
      set({ 
        messages: result.messages || [],
        messagesPagination: result.pagination,
        localMessages: [] // Сбрасываем локальные сообщения при загрузке новых
      })
      
    } catch (error) {
      console.error('❌ Ошибка получения сообщений через WebSocket:', error)
      
      let errorMessage = 'Не удалось загрузить сообщения'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Не удалось загрузить сообщения: превышено время ожидания'
        } else if (error.message.includes('WebSocket не подключен')) {
          errorMessage = 'Нет соединения с сервером WhatsApp'
        }
      }
      
      toast.error(errorMessage)
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (sessionId: string, chatId: string, message: string) => {
    try {
      // Создаем локальное сообщение для оптимистичного обновления
      const localMessage: LocalMessage = {
        localId: `local_${Date.now()}_${Math.random()}`,
        chatId,
        sessionId,
        fromMe: true,
        fromNumber: 'local',
        fromName: 'Вы',
        body: message,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        isRead: false,
        managerId: null,
        status: 'sending',
        isOptimistic: true
      }
      
      // Добавляем локальное сообщение сразу
      get().addLocalMessage(localMessage)
      
      // Отправляем через WebSocket
      await whatsappSocketService.sendMessage(sessionId, chatId, message)
      
      // Помечаем локальное сообщение как отправленное
      // Реальное сообщение придет через event 'whatsapp:new_message' и заменит локальное
      set((state) => ({
        localMessages: state.localMessages.map(msg =>
          msg.localId === localMessage.localId
            ? { ...msg, status: 'sent' as MessageStatus }
            : msg
        )
      }))
      
      console.log('✅ Сообщение отправлено через WebSocket')
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения через WebSocket:', error)
      
      // Помечаем локальное сообщение как ошибочное
      set((state) => {
        const updatedLocalMessages = state.localMessages.map(msg =>
          msg.chatId === chatId && msg.body === message
            ? { ...msg, status: 'failed' as MessageStatus, error: 'Ошибка отправки' }
            : msg
        )
        return { localMessages: updatedLocalMessages }
      })
      
      let errorMessage = 'Не удалось отправить сообщение'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Не удалось отправить сообщение: превышено время ожидания'
        } else if (error.message.includes('WebSocket не подключен')) {
          errorMessage = 'Нет соединения с сервером WhatsApp'
        }
      }
      
      toast.error(errorMessage)
    }
  },

  // REST API методы для управления доступами
  grantManagerAccess: async (sessionId: string, managerId: string, permissions: ('read' | 'write')[]) => {
    try {
      const token = useAuthStore.getState().token
      
      const requestData: ManagerAccessRequest = { 
        managerId,
        canRead: permissions.includes('read'),
        canWrite: permissions.includes('write'),
        canManageChats: false
      }
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions/${sessionId}/access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при предоставлении доступа')
      }
      
      const result: ApiResponse<void> = await response.json()
      
      if (result.success) {
        toast.success('Доступ предоставлен менеджеру')
      }
    } catch (error) {
      console.error('Ошибка предоставления доступа:', error)
      toast.error('Не удалось предоставить доступ')
    }
  },

  revokeManagerAccess: async (sessionId: string, managerId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions/${sessionId}/access/${managerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при отзыве доступа')
      }
      
      const result: ApiResponse<void> = await response.json()
      
      if (result.success) {
        toast.success('Доступ отозван')
      }
    } catch (error) {
      console.error('Ошибка отзыва доступа:', error)
      toast.error('Не удалось отозвать доступ')
    }
  },

  fetchManagerAccess: async (sessionId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions/${sessionId}/access`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при получении списка доступов')
      }
      
      const result: ApiResponse<WhatsAppManagerAccess[]> = await response.json()
      
      if (result.success && result.data) {
        return result.data
      }
      
      return []
    } catch (error) {
      console.error('Ошибка получения списка доступов:', error)
      toast.error('Не удалось загрузить список доступов')
      return []
    }
  },

  // Статистика
  fetchStats: async () => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при получении статистики')
      }
      
      const result: ApiResponse<WhatsAppStats> = await response.json()
      
      if (result.success && result.data) {
        set({ stats: result.data })
      }
    } catch (error) {
      console.error('Ошибка получения статистики:', error)
      toast.error('Не удалось загрузить статистику')
    }
  },

  // QR код
  getQRCode: async (sessionId: string) => {
    try {
      console.log('🔄 Запрашиваем QR-код для сессии:', sessionId)
      const token = useAuthStore.getState().token
      
      const response = await fetch(`${BASE_URL}/api/whatsapp/sessions/${sessionId}/qr`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.error('❌ Ошибка HTTP при получении QR кода:', response.status, response.statusText)
        throw new Error('Ошибка при получении QR кода')
      }
      
      const result: ApiResponse<{ qrCode: string; isConnected?: boolean }> = await response.json()
      console.log('📱 Ответ от сервера для QR-кода:', {
        success: result.success,
        hasQRCode: !!result.data?.qrCode,
        isConnected: result.data?.isConnected,
        qrCodeLength: result.data?.qrCode?.length
      })
      
      if (result.success && result.data) {
        if (result.data.qrCode) {
          console.log('✅ Устанавливаем QR-код в store')
          set({ qrCode: result.data.qrCode, connectionStatus: 'waiting' })
          return {
            qrCode: result.data.qrCode,
            isConnected: result.data.isConnected || false
          }
        } else if (result.data.isConnected) {
          console.log('✅ Сессия уже подключена - автоматически обновляем состояние')
          
          // Убираем QR-код и обновляем статус на подключено
          set({ 
            qrCode: null, 
            connectionStatus: 'connected' 
          })
          
          // Обновляем информацию о подключенной сессии в списке сессий
          set((state) => {
            const updatedSessions = state.sessions.map(session =>
              session.id === sessionId 
                ? { ...session, isConnected: true }
                : session
            )
            return { sessions: updatedSessions }
          })
          
          // Показываем уведомление о подключении
          toast.success('WhatsApp сессия уже подключена!')
          
          // Тихо обновляем список сессий для получения актуальной информации
          console.log('🔄 Тихое обновление списка сессий после обнаружения подключения')
          get().fetchSessions(true)
          
          return {
            qrCode: '',
            isConnected: true
          }
        } else {
          console.log('ℹ️ QR-код отсутствует в ответе, сессия не подключена')
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Ошибка получения QR кода:', error)
      toast.error('Не удалось получить QR код')
      return null
    }
  },

  // Вспомогательные методы
  addMessage: (message: WhatsAppMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },

  addLocalMessage: (message: LocalMessage) => {
    set((state) => ({
      localMessages: [...state.localMessages, message]
    }))
  },

  updateMessageStatus: (messageId: string, status: MessageStatus) => {
    set((state) => {
      const updatedMessages = state.messages.map(msg =>
        msg.messageId === messageId ? { ...msg, status } : msg
      )
      const updatedLocalMessages = state.localMessages.map(msg =>
        msg.localId === messageId ? { ...msg, status } : msg
      )
      return { messages: updatedMessages, localMessages: updatedLocalMessages }
    })
  },

  removeLocalMessage: (localId: string) => {
    set((state) => ({
      localMessages: state.localMessages.filter(msg => msg.localId !== localId)
    }))
  },

  replaceLocalMessageWithReal: (localMessage: LocalMessage, realMessage: WhatsAppMessage) => {
    set((state) => ({
      localMessages: state.localMessages.filter(msg => msg.localId !== localMessage.localId),
      messages: [...state.messages, realMessage]
    }))
  },

  cleanupOldLocalMessages: () => {
    const now = Date.now()
    const fifteenMinutes = 15 * 60 * 1000 // 15 минут в миллисекундах
    
    set((state) => ({
      localMessages: state.localMessages.filter(msg => {
        const messageTime = new Date(msg.timestamp).getTime()
        const isOld = now - messageTime > fifteenMinutes
        const isSent = msg.status === 'sent'
        
        // Удаляем только старые отправленные сообщения
        return !(isOld && isSent)
      })
    }))
  },

  updateChatUnreadCount: (chatId: string, count: number) => {
    set((state) => {
      const updatedChats = state.chats.map(chat =>
        chat.chatId === chatId ? { ...chat, unreadCount: count } : chat
      )
      return { chats: updatedChats }
    })
  },

  markChatAsRead: async (sessionId: string, chatId: string) => {
    try {
      // Отмечаем локально сразу для лучшего UX
      set((state) => {
        const updatedChats = state.chats.map(chat =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
        return { chats: updatedChats }
      })

      // Отправляем запрос на сервер через WebSocket
      const result = await whatsappSocketService.markChatAsRead(sessionId, chatId)
      
      console.log(`✅ Отмечено ${result.markedCount} сообщений как прочитанные в чате ${chatId}`)
      
      // Обновляем состояние данными с сервера
      set((state) => {
        const updatedChats = state.chats.map(chat =>
          chat.id === chatId ? { ...chat, ...result.chat } : chat
        )
        return { chats: updatedChats }
      })

    } catch (error) {
      console.error('❌ Ошибка отметки сообщений как прочитанные:', error)
      
      // В случае ошибки возвращаем локальное состояние назад
      const currentState = get()
      const originalChat = currentState.chats.find(chat => chat.id === chatId)
      if (originalChat) {
        set((state) => {
          const updatedChats = state.chats.map(chat =>
            chat.id === chatId ? originalChat : chat
          )
          return { chats: updatedChats }
        })
      }
      
      toast.error('Не удалось отметить сообщения как прочитанные')
    }
  },

  setCurrentChat: (chatId: string | null) => {
    console.log('🔄 Установка текущего чата:', chatId)
    set({ currentChatId: chatId })
  },

  // Polling методы для резервной проверки
  startPolling: () => {
    // Останавливаем предыдущий polling если он был
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    console.log('⏲️ Запуск тихого polling для проверки статуса сессий')
    
    // Проверяем каждые 12 секунд - более разумная частота
    pollingInterval = setInterval(() => {
      const currentState = get()
      
      // Проверяем только если есть WebSocket соединение
      if (currentState.isConnected) {
        // Проверяем есть ли неподключенные активные сессии
        const pendingSessions = currentState.sessions.filter(session => 
          session.isActive && (!session.isConnected || session.phoneNumber === 'pending')
        )
        
        if (pendingSessions.length > 0) {
          // Тихое обновление без loader и минимального логирования
          get().fetchSessions(true) // silent = true
        }
      }
    }, 12000) // Каждые 12 секунд
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  },

  // Отладочная функция для проверки состояния
  debugState: () => {
    const state = get()
    console.log('🔍 Текущее состояние WhatsApp Store:', {
      isConnected: state.isConnected,
      currentSessionId: state.currentSessionId,
      currentChatId: state.currentChatId,
      messagesCount: state.messages.length,
      localMessagesCount: state.localMessages.length,
      chatsCount: state.chats.length
    })
    return state
  },

  // Cleanup
  reset: () => {
    const state = get()
    if (state.socket) {
      whatsappSocketService.disconnect()
    }
    
    // Останавливаем polling
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    
    set({
      socket: null,
      isConnected: false,
      currentSessionId: null,
      currentChatId: null, // Сбрасываем текущий чат
      permissions: null,
      sessions: [],
      chats: [],
      messages: [],
      stats: null,
      isLoading: false,
      connectionStatus: 'disconnected',
      qrCode: null,
      localMessages: [],
      chatsPagination: null,
      messagesPagination: null
    })
  }
}))

// Автоматическая инициализация WebSocket при создании store
export const initWhatsAppSocket = () => {
  const store = useWhatsAppStore.getState()
  if (!store.socket || !store.socket.connected) {
    store.initSocket()
  }
} 