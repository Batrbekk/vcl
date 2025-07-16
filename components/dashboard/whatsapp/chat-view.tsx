"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWhatsAppStore } from "@/store/whatsapp-store"
import { WhatsAppChat, WhatsAppMessage, LocalMessage, UserPermissions } from "@/types/whatsapp"
import { 
  MessageCircle, 
  Send, 
  Phone, 
  Users, 
  Clock, 
  Search, 
  CheckCheck, 
  Check, 
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatListProps {
  sessionId: string
  permissions: UserPermissions
  onChatSelect: (chat: WhatsAppChat) => void
  selectedChatId?: string
}

function ChatList({ sessionId, permissions, onChatSelect, selectedChatId }: ChatListProps) {
  const { chats, isLoading, fetchChats } = useWhatsAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  // Загружаем чаты при монтировании
  useEffect(() => {
    if (sessionId && permissions.canRead) {
      fetchChats(sessionId, {
        includeGroups: false,
        includeStatus: false,
        chatType: 'individual'
      })
    }
  }, [sessionId, permissions.canRead, fetchChats])

  // Фильтрация чатов
  const filteredChats = (chats || []).filter(chat => 
    chat.chatName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!permissions.canRead) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав для просмотра чатов
        </AlertDescription>
      </Alert>
    )
  }

  const getChatAvatar = (chat: WhatsAppChat) => {
    if (chat.isGroup) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${chat.chatName}&backgroundColor=10b981`
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.chatName}`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Чаты</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => useWhatsAppStore.getState().debugState()}
              title="Отладка состояния"
            >
              🔍
            </Button>
            <Badge variant="secondary">{filteredChats.length}</Badge>
          </div>
        </div>
        
        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <MessageCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? "Чаты не найдены" : "Нет активных чатов"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                  selectedChatId === chat.id && "bg-accent"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getChatAvatar(chat)} />
                  <AvatarFallback>
                    {chat.isGroup ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      chat.chatName.charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {chat.chatName}
                      {chat.isGroup && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Группа
                        </Badge>
                      )}
                    </p>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessageText || "Нет сообщений"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs min-w-[20px] h-5">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </ScrollArea>
      </div>
    </div>
  )
}

interface ChatWindowProps {
  sessionId: string
  chat: WhatsAppChat
  permissions: UserPermissions
}

function ChatWindow({ sessionId, chat, permissions }: ChatWindowProps) {
  const { 
    messages, 
    localMessages,
    isLoading, 
    fetchMessages, 
    sendMessage,
    markChatAsRead,
    setCurrentChat
  } = useWhatsAppStore()
  
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загружаем сообщения при смене чата
  useEffect(() => {
    if (chat.id && permissions.canRead) {
      console.log('🔄 Переключаемся на чат:', chat.id)
      fetchMessages(sessionId, chat.id)
      // Отмечаем чат как прочитанный при входе в него
      if (chat.unreadCount > 0) {
        markChatAsRead(sessionId, chat.id)
      }
    }
  }, [chat.id, sessionId, permissions.canRead]) // Убираем лишние зависимости

  // Устанавливаем текущий чат при открытии компонента
  useEffect(() => {
    console.log('🔄 ChatWindow: Устанавливаем текущий чат:', chat.id)
    setCurrentChat(chat.id)
    return () => {
      // Сбрасываем текущий чат при закрытии окна чата
      console.log('🔄 ChatWindow: Сбрасываем текущий чат')
      setCurrentChat(null)
    }
  }, [chat.id, setCurrentChat])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, localMessages])

  // Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageText.trim() || !permissions.canWrite || isSending) return

    setIsSending(true)
    try {
      await sendMessage(sessionId, chat.id, messageText.trim())
      setMessageText('')
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (!permissions.canRead) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав для просмотра сообщений
        </AlertDescription>
      </Alert>
    )
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера"
    } else {
      return date.toLocaleDateString('ru-RU')
    }
  }

  // Объединяем реальные и локальные сообщения
  const allMessages = [
    ...messages,
    ...localMessages.map(local => ({
      ...local,
      id: local.localId,
      messageId: local.localId,
      createdAt: local.timestamp
    }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const renderMessageStatus = (message: WhatsAppMessage | (LocalMessage & { id: string; messageId: string; createdAt: string })) => {
    if (!message.fromMe) return null

    const isLocalMessage = 'isOptimistic' in message
    const status = isLocalMessage ? (message as unknown as LocalMessage).status : 'read'

    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 opacity-70 animate-pulse" />
      case 'sent':
        return <Check className="h-3 w-3 opacity-70" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 opacity-70" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />
      case 'failed':
        return (
          <div className="flex items-center space-x-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-500">Не отправлено</span>
          </div>
        )
      default:
        return <Check className="h-3 w-3 opacity-70" />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок чата */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {chat.isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                chat.chatName[0]?.toUpperCase() || 'U'
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{chat.chatName}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {chat.isGroup ? (
                <Users className="h-3 w-3" />
              ) : (
                <Phone className="h-3 w-3" />
              )}
              <span>{chat.chatId}</span>
              <span>•</span>
              <span>{chat._count.messages} сообщений</span>
            </div>
          </div>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <MessageCircle className="h-6 w-6 animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Загрузка сообщений...</span>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Нет сообщений в этом чате
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Отправьте первое сообщение для начала общения
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allMessages.map((message, index) => {
                const showDate = index === 0 || 
                  formatDate(message.timestamp) !== formatDate(allMessages[index - 1]?.timestamp || "")
                
                const isLocalMessage = 'isOptimistic' in message
                const localMsg = isLocalMessage ? (message as unknown as LocalMessage) : null
                
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex",
                        message.fromMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 space-y-1",
                          message.fromMe
                            ? isLocalMessage && localMsg?.status === 'failed'
                              ? "bg-red-100 border border-red-200 text-red-900"
                              : "bg-primary text-primary-foreground"
                            : "bg-muted",
                          isLocalMessage && localMsg?.status === 'sending' && "opacity-70"
                        )}
                      >
                        {!message.fromMe && (
                          <p className="text-xs font-medium opacity-70">{message.fromName}</p>
                        )}
                        
                        <p className="text-sm">{message.body}</p>
                        
                        <div className="flex items-center justify-end space-x-1 text-xs opacity-70">
                          <span>{formatTime(message.timestamp)}</span>
                          {renderMessageStatus(message)}
                        </div>
                        
                        {/* Показываем ошибку для неотправленных сообщений */}
                        {isLocalMessage && localMsg?.status === 'failed' && localMsg?.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {localMsg.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Поле ввода сообщения */}
      {permissions.canWrite && (
        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              placeholder="Введите сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || isSending}
              size="icon"
            >
              {isSending ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}



interface ChatViewProps {
  sessionId: string
  permissions: UserPermissions
}

export function WhatsAppChatView({ sessionId, permissions }: ChatViewProps) {
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null)

  const handleChatSelect = (chat: WhatsAppChat) => {
    setSelectedChat(chat)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[600px] max-h-[80vh]">
      {/* Список чатов */}
      <div className="lg:col-span-1 border rounded-l-lg border-r-1">
        <ChatList
          sessionId={sessionId}
          permissions={permissions}
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChat?.id}
        />
      </div>

      {/* Окно чата */}
      <div className="lg:col-span-2 border rounded-r-lg border-l-0 overflow-hidden">
        {selectedChat ? (
          <ChatWindow
            sessionId={sessionId}
            chat={selectedChat}
            permissions={permissions}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">Выберите чат</h3>
              <p className="text-muted-foreground">
                Выберите чат из списка для начала общения
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 