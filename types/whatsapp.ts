// WhatsApp Session Types
export interface WhatsAppSession {
  id: string;
  companyId: string;
  adminId: string;
  displayName: string;
  phoneNumber: string | null;
  isActive: boolean;
  isConnected: boolean;
  qrCode: string | null;
  lastSeen: string | null;
  createdAt: string;
  updatedAt?: string;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    chats: number;
    messages: number;
  };
}

// WhatsApp Chat Types
export interface WhatsAppChat {
  id: string;
  sessionId: string;
  companyId?: string;
  chatId: string; // WhatsApp ID like "77079856339@c.us"
  chatName: string;
  chatType: 'individual' | 'group' | 'status';
  isGroup: boolean;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt?: string;
  _count: {
    messages: number;
  };
}

// WhatsApp Message Types
export interface WhatsAppMessage {
  id: string;
  messageId: string; // WhatsApp message ID
  chatId: string; // Ссылка на чат
  sessionId: string;
  companyId?: string;
  fromMe: boolean;
  fromNumber: string; // Номер отправителя
  fromName: string; // Имя отправителя
  body: string; // Текст сообщения
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker';
  mediaUrl?: string | null;
  timestamp: string;
  isRead: boolean;
  managerId: string | null;
  createdAt: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// Message Status Types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// WhatsApp Manager Access Types
export interface WhatsAppManagerAccess {
  id: string;
  managerId: string;
  sessionId: string;
  companyId: string;
  canRead: boolean;
  canWrite: boolean;
  canManageChats: boolean;
  grantedAt: string;
  grantedBy: string;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  grantedByUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// WhatsApp Statistics Types
export interface WhatsAppStats {
  sessions?: {
    total?: number;
    active?: number;
    connected?: number;
  };
  messages?: {
    total?: number;
    today?: number;
    sent?: number;
    received?: number;
  };
  chats?: {
    total?: number;
    individual?: number;
    groups?: number;
  };
  managers?: {
    total?: number;
    withAccess?: number;
  };
}

// User Permissions для сессии
export interface UserPermissions {
  canRead: boolean
  canWrite: boolean
  canManageChats: boolean
}

// WebSocket response
export interface WebSocketResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// Опции для получения чатов
export interface GetChatsOptions {
  page?: number
  limit?: number
  includeGroups?: boolean
  includeStatus?: boolean
  chatType?: 'individual' | 'group' | 'all'
}

// События WebSocket (клиент → сервер)
export interface ClientToServerEvents {
  'whatsapp:join_session': (data: { sessionId: string }, callback: (response: WebSocketResponse<{ session: WhatsAppSession, permissions: UserPermissions }>) => void) => void
  'whatsapp:leave_session': (data: { sessionId: string }, callback: (response: WebSocketResponse) => void) => void
  'whatsapp:get_chats': (data: { sessionId: string } & GetChatsOptions, callback: (response: WebSocketResponse<{ chats: WhatsAppChat[], pagination: PaginationResponse<WhatsAppChat>['pagination'] }>) => void) => void
  'whatsapp:get_messages': (data: { sessionId: string, chatId: string, page?: number, limit?: number }, callback: (response: WebSocketResponse<{ messages: WhatsAppMessage[], pagination: PaginationResponse<WhatsAppMessage>['pagination'] }>) => void) => void
  'whatsapp:send_message': (data: { sessionId: string, chatId: string, message: string }, callback: (response: WebSocketResponse) => void) => void
  'whatsapp:get_session_status': (data: { sessionId: string }, callback: (response: WebSocketResponse<WhatsAppSession>) => void) => void
}

// События WebSocket (сервер → клиент)
export interface ServerToClientEvents {
  'whatsapp:new_message': (data: { sessionId: string, companyId: string, chat: WhatsAppChat, message: WhatsAppMessage }) => void
  'whatsapp:chats_updated': (data: { sessionId: string, companyId: string }) => void
  'whatsapp:session_status': (data: { sessionId: string, status: string, qrCode?: string, phoneNumber?: string, displayName?: string, isConnected?: boolean }) => void
}

// API Response Types
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// QR Code Response
export interface QRCodeResponse {
  qrCode: string;
}

// Session Creation Request
export interface CreateSessionRequest {
  displayName: string;
}

// Send Message Request
export interface SendMessageRequest {
  message: string;
  type: 'text';
}

// Manager Access Request
export interface ManagerAccessRequest {
  managerId: string;
  canRead?: boolean;
  canWrite?: boolean;
  canManageChats?: boolean;
}

// WebSocket Event Types (старые события - для обратной совместимости)
export interface SocketWhatsAppEvents {
  // Message Events
  'whatsapp:new-message': {
    sessionId: string;
    companyId: string;
    chat: WhatsAppChat;
    message: WhatsAppMessage;
  };
  'whatsapp:chat-updated': {
    sessionId: string;
    companyId: string;
    chatId: string;
    lastMessageAt: string;
    lastMessageText: string;
    unreadCount: number;
  };

  // Session Events
  'whatsapp:qr-updated': {
    sessionId: string;
    qrCode: string;
  };
  'whatsapp:session-connected': {
    sessionId: string;
    phoneNumber: string;
    displayName: string;
  };
  'whatsapp:session-disconnected': {
    sessionId: string;
    reason: string;
  };

  // Statistics Events
  'whatsapp:stats-updated': {
    companyId: string;
    stats: {
      totalChats: number;
      unreadChats: number;
      totalMessages: number;
      todayMessages: number;
      connectedSessions: number;
    };
  };

  // Activity Events
  'whatsapp:typing-status': {
    sessionId: string;
    chatId: string;
    isTyping: boolean;
    participantId: string;
    timestamp: string;
  };
  'whatsapp:message-status': {
    sessionId: string;
    messageId: string;
    status: 'sent' | 'delivered' | 'read';
    timestamp: string;
  };

  // Error Events
  'whatsapp:session-error': {
    sessionId: string;
    errorType: string;
    message: string;
    timestamp: string;
  };
  'whatsapp:send-error': {
    sessionId: string;
    chatId: string;
    messageText: string;
    errorType: string;
    message: string;
    timestamp: string;
  };

  // Manager Access Events
  'whatsapp:manager-access-granted': {
    sessionId: string;
    managerId: string;
    managerName: string;
    permissions: string[];
    grantedBy: string;
    timestamp: string;
  };
  'whatsapp:manager-access-revoked': {
    sessionId: string;
    managerId: string;
    managerName: string;
    revokedBy: string;
    timestamp: string;
  };
}

// Local Message State (for optimistic updates)
export interface LocalMessage extends Omit<WhatsAppMessage, 'id' | 'messageId' | 'createdAt'> {
  localId: string;
  status: MessageStatus;
  error?: string;
  isOptimistic?: boolean;
} 