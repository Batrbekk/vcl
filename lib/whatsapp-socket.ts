import { io, Socket } from 'socket.io-client'
import { 
  WhatsAppSession, 
  WhatsAppChat, 
  WhatsAppMessage, 
  UserPermissions,
  GetChatsOptions,
  WebSocketResponse,
  PaginationResponse
} from '@/types/whatsapp'

export interface SocketErrorHandlers {
  onConnectionError?: (error: Error, errorType: 'timeout' | 'connection_failed' | 'auth_error' | 'unknown') => void
  onDisconnect?: (reason: string) => void
}

export class WhatsAppSocketService {
  private socket: Socket | null = null
  private errorHandlers: SocketErrorHandlers = {}
  
  connect(token: string, errorHandlers?: SocketErrorHandlers): Socket {
    if (this.socket?.connected) {
      console.log('🔄 WebSocket уже подключен, возвращаем существующий сокет')
      return this.socket
    }

    // Сохраняем обработчики ошибок
    this.errorHandlers = errorHandlers || {}

    // Получаем URL бэкенда из переменной окружения
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    const socketUrl = baseUrl ? `${baseUrl}/whatsapp` : '/whatsapp'
    
    console.log('🔌 Подключение WhatsApp WebSocket:', {
      baseUrl,
      socketUrl,
      hasToken: !!token
    })

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000 // 10 секунд timeout
    })
    
    this.setupEventHandlers()
    
    // Дополнительная отладка состояния сокета
    setTimeout(() => {
      console.log('🔍 Проверка состояния сокета через 1 секунду:', {
        connected: this.socket?.connected,
        id: this.socket?.id,
        hasSocket: !!this.socket
      })
    }, 1000)
    
    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ WhatsApp WebSocket подключен к namespace /whatsapp')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WhatsApp WebSocket отключен от namespace /whatsapp, причина:', reason)
      
      // Вызываем обработчик отключения если он задан
      if (this.errorHandlers.onDisconnect) {
        this.errorHandlers.onDisconnect(reason)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения WhatsApp WebSocket:', error)
      
      // Определяем тип ошибки
      let errorType: 'timeout' | 'connection_failed' | 'auth_error' | 'unknown' = 'unknown'
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout'
      } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        errorType = 'auth_error'
      } else if (error.message.includes('connection')) {
        errorType = 'connection_failed'
      }
      
      // Вызываем обработчик ошибок если он задан
      if (this.errorHandlers.onConnectionError) {
        this.errorHandlers.onConnectionError(error, errorType)
      }
    })

    // Добавляем обработку ошибок таймаута на уровне сокета
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error)
      
      if (this.errorHandlers.onConnectionError) {
        this.errorHandlers.onConnectionError(error, 'unknown')
      }
    })
    
    // Отладочные события
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket переподключен после', attemptNumber, 'попыток')
    })
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Попытка переподключения WebSocket #', attemptNumber)
    })
    
    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Ошибка переподключения WebSocket:', error)
    })
    
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Переподключение WebSocket не удалось после всех попыток')
    })
  }

  // Подключение к сессии
  joinSession(sessionId: string): Promise<{ session: WhatsAppSession, permissions: UserPermissions }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:join_session', { sessionId }, (response: WebSocketResponse<{ session: WhatsAppSession, permissions: UserPermissions }>) => {
        if (response.success && response.data) {
          resolve(response.data)
        } else {
          reject(new Error(response.message || 'Ошибка подключения к сессии'))
        }
      })
    })
  }

  // Отключение от сессии
  leaveSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:leave_session', { sessionId }, (response: WebSocketResponse<void>) => {
        if (response.success) {
          resolve()
        } else {
          reject(new Error(response.message || 'Ошибка отключения от сессии'))
        }
      })
    })
  }

  // Получение чатов
  getChats(sessionId: string, options: GetChatsOptions = {}): Promise<{ chats: WhatsAppChat[], pagination: PaginationResponse<WhatsAppChat>['pagination'] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:get_chats', { sessionId, ...options }, (response: WebSocketResponse<{ chats: WhatsAppChat[], pagination: PaginationResponse<WhatsAppChat>['pagination'] }>) => {
        if (response.success && response.data) {
          resolve(response.data)
        } else {
          reject(new Error(response.message || 'Ошибка получения чатов'))
        }
      })
    })
  }

  // Получение сообщений
  getMessages(sessionId: string, chatId: string, page = 1, limit = 50): Promise<{ messages: WhatsAppMessage[], pagination: PaginationResponse<WhatsAppMessage>['pagination'] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:get_messages', { sessionId, chatId, page, limit }, (response: WebSocketResponse<{ messages: WhatsAppMessage[], pagination: PaginationResponse<WhatsAppMessage>['pagination'] }>) => {
        if (response.success && response.data) {
          resolve(response.data)
        } else {
          reject(new Error(response.message || 'Ошибка получения сообщений'))
        }
      })
    })
  }

  // Отправка сообщения
  sendMessage(sessionId: string, chatId: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:send_message', { sessionId, chatId, message }, (response: WebSocketResponse<void>) => {
        if (response.success) {
          resolve()
        } else {
          reject(new Error(response.message || 'Ошибка отправки сообщения'))
        }
      })
    })
  }

  // Отметка сообщений как прочитанных
  markChatAsRead(sessionId: string, chatId: string): Promise<{ markedCount: number; chat: WhatsAppChat }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:mark_chat_as_read', { sessionId, chatId }, (response: WebSocketResponse<{ markedCount: number; chat: WhatsAppChat }>) => {
        if (response.success && response.data) {
          resolve(response.data)
        } else {
          reject(new Error(response.message || 'Ошибка отметки сообщений как прочитанных'))
        }
      })
    })
  }

  // Получение статуса сессии
  getSessionStatus(sessionId: string): Promise<WhatsAppSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'))
        return
      }

      this.socket.emit('whatsapp:get_session_status', { sessionId }, (response: WebSocketResponse<WhatsAppSession>) => {
        if (response.success && response.data) {
          resolve(response.data)
        } else {
          reject(new Error(response.message || 'Ошибка получения статуса сессии'))
        }
      })
    })
  }

  // Подписка на события
  onNewMessage(callback: (data: { sessionId: string, companyId: string, chat: WhatsAppChat, message: WhatsAppMessage }) => void): void {
    this.socket?.on('whatsapp:new_message', callback)
  }

  onChatsUpdated(callback: (data: { sessionId: string, companyId: string }) => void): void {
    this.socket?.on('whatsapp:chats_updated', callback)
  }

  onChatUpdated(callback: (data: { sessionId: string, companyId: string, chat: WhatsAppChat }) => void): void {
    this.socket?.on('whatsapp:chat_updated', callback)
  }

  onSessionStatus(callback: (data: { sessionId: string, status: string, qrCode?: string, phoneNumber?: string, displayName?: string, isConnected?: boolean }) => void): void {
    this.socket?.on('whatsapp:session_status', callback)
  }

  // Отписка от событий
  offNewMessage(callback?: (data: { sessionId: string, companyId: string, chat: WhatsAppChat, message: WhatsAppMessage }) => void): void {
    this.socket?.off('whatsapp:new_message', callback)
  }

  offChatsUpdated(callback?: (data: { sessionId: string, companyId: string }) => void): void {
    this.socket?.off('whatsapp:chats_updated', callback)
  }

  offChatUpdated(callback?: (data: { sessionId: string, companyId: string, chat: WhatsAppChat }) => void): void {
    this.socket?.off('whatsapp:chat_updated', callback)
  }

  offSessionStatus(callback?: (data: { sessionId: string, status: string, qrCode?: string, phoneNumber?: string, displayName?: string, isConnected?: boolean }) => void): void {
    this.socket?.off('whatsapp:session_status', callback)
  }

  // Получение текущего сокета
  getSocket(): Socket | null {
    return this.socket
  }

  // Проверка подключения
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Создаем синглтон
export const whatsappSocketService = new WhatsAppSocketService() 