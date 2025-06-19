import { create } from 'zustand'
import { useAuthStore } from './auth-store'

interface TranscriptItem {
  message: string | null;
  role: 'agent' | 'user';
  time_in_call_secs: number;
  tool_calls?: unknown[];
  tool_results?: unknown[];
}

interface ConversationAnalysis {
  evaluation_criteria_results: Record<string, unknown>;
  data_collection_results: Record<string, unknown>;
  call_successful: string;
  transcript_summary: string;
}

interface Conversation {
  agent_id: string
  agent_name: string
  conversation_id: string
  start_time_unix_secs: number
  call_duration_secs: number
  message_count: number
  status: string
  call_successful: string
}

interface ConversationDetails {
  audio_url?: string
  transcription?: TranscriptItem[]
  analysis?: ConversationAnalysis
}

interface ConversationsResponse {
  message: string
  conversations: Conversation[]
  next_cursor: string | null
  has_more: boolean
  retrieved_at: string
}

interface ConversationFilters {
  agent_id?: string
  call_successful?: string
  call_start_before_unix?: number
  call_start_after_unix?: number
  page_size?: number
}

interface ConversationsStore {
  conversations: Conversation[]
  currentConversation?: Conversation & ConversationDetails
  isLoading: boolean
  error: string | null
  filters: ConversationFilters
  fetchConversations: (filters?: ConversationFilters) => Promise<void>
  fetchConversationDetails: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  setFilters: (filters: ConversationFilters) => void
  clearFilters: () => void
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useConversations = create<ConversationsStore>((set, get) => ({
  conversations: [],
  currentConversation: undefined,
  isLoading: false,
  error: null,
  filters: {},

  setFilters: (filters: ConversationFilters) => {
    set({ filters })
  },

  clearFilters: () => {
    set({ filters: {} })
  },

  fetchConversations: async (customFilters?: ConversationFilters) => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      // Объединяем фильтры из состояния с переданными параметрами
      const currentFilters = get().filters
      const filters = { ...currentFilters, ...customFilters }

      const url = new URL(`${BASE_URL}/api/agents/conversations`)
      
      // Добавляем параметры фильтрации
      if (filters.agent_id) url.searchParams.set('agent_id', filters.agent_id)
      if (filters.call_successful) url.searchParams.set('call_successful', filters.call_successful)
      if (filters.call_start_before_unix) url.searchParams.set('call_start_before_unix', String(filters.call_start_before_unix))
      if (filters.call_start_after_unix) url.searchParams.set('call_start_after_unix', String(filters.call_start_after_unix))
      url.searchParams.set('page_size', String(filters.page_size || 100))

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при получении списка разговоров')
      }

      const data: ConversationsResponse = await response.json()
      
      console.log('Conversations loaded:', data);
      set({ conversations: data.conversations })
    } catch (error) {
      console.error('Error in fetchConversations:', error);
      set({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchConversationDetails: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }
      
      // Получаем детали разговора
      const detailsResponse = await fetch(`${BASE_URL}/api/agents/conversations/${id}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const details = await detailsResponse.json()
      
      if (!detailsResponse.ok) {
        console.error('Error fetching details:', details);
        throw new Error(details.error || 'Failed to fetch conversation details')
      }

      // Создаем URL для аудио
      const audioUrl = `${BASE_URL}/api/agents/conversations/${id}/audio`;

      const conversation = get().conversations.find(c => c.conversation_id === id)
      if (!conversation) {
        console.error('Conversation not found in state:', id);
        throw new Error('Conversation not found')
      }

      const updatedConversation = {
        ...conversation,
        audio_url: audioUrl,
        transcription: details.transcript,
        analysis: details.analysis
      };

      set({ currentConversation: updatedConversation })
    } catch (error) {
      console.error('Error in fetchConversationDetails:', error);
      set({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete conversation')
      }

      set(state => ({
        conversations: state.conversations.filter(c => c.conversation_id !== id),
        currentConversation: state.currentConversation?.conversation_id === id 
          ? undefined 
          : state.currentConversation
      }))
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      set({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' })
    } finally {
      set({ isLoading: false })
    }
  }
})) 