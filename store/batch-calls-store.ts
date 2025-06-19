import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export interface Recipient {
  id: string
  phone_number: string
  status: string
  created_at_unix: number
  updated_at_unix: number
  conversation_id: string | null
  conversation_initiation_client_data: {
    conversation_config_override: {
      tts: {
        voice_id: string | null
      }
      conversation: unknown
      agent: {
        first_message: string
        language: string
        prompt: string | null
      }
    }
    custom_llm_extra_body: Record<string, unknown>
    dynamic_variables: Record<string, string>
  }
}

export interface BatchCall {
  id: string
  phone_number_id: string
  phone_provider: string
  name: string
  agent_id: string
  created_at_unix: number
  scheduled_time_unix: number
  total_calls_dispatched: number
  total_calls_scheduled: number
  last_updated_at_unix: number
  status: string
  agent_name: string
}

export interface BatchCallDetails extends BatchCall {
  recipients: Recipient[]
}

export interface BatchCallsResponse {
  batch_calls: BatchCall[]
  next_doc: string | null
  has_more: boolean
}

export interface CreateBatchCallData {
  name: string
  agent_id: string
  phone_number_id: string
  scheduled_time_unix?: number
  recipients: string[]
}

export interface CreateBatchCallResponse {
  message: string
  batch_call_id: string
  created_at: string
}

// Новые интерфейсы для корректного API
export interface BatchCallRecipient {
  id?: string
  phone_number: string
  conversation_initiation_client_data?: {
    conversation_config_override?: {
      agent?: {
        prompt?: string | null
        first_message?: string
        language?: string
      }
      tts?: {
        voice_id?: string | null
      }
      conversation?: unknown
    }
    custom_llm_extra_body?: Record<string, unknown>
    dynamic_variables?: Record<string, string>
  }
}

export interface CreateBatchCallRequestData {
  call_name: string
  agent_id: string
  agent_phone_number_id: string
  scheduled_time_unix?: number
  recipients: BatchCallRecipient[]
}

interface BatchCallsStore {
  batchCalls: BatchCall[]
  isLoading: boolean
  setBatchCalls: (batchCalls: BatchCall[]) => void
  fetchBatchCalls: (pageSize?: number) => Promise<void>
  fetchBatchCall: (id: string) => Promise<BatchCallDetails | null>
  deleteBatchCall: (id: string) => Promise<void>
  updateBatchCall: (id: string, data: Partial<CreateBatchCallData>) => Promise<void>
  createBatchCall: (data: CreateBatchCallData) => Promise<string | null>
  createBatchCallNew: (data: CreateBatchCallRequestData) => Promise<string | null>
  cancelBatchCall: (id: string) => Promise<boolean>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useBatchCallsStore = create<BatchCallsStore>((set) => ({
  batchCalls: [],
  isLoading: false,
  setBatchCalls: (batchCalls) => set({ batchCalls }),
  
  fetchBatchCalls: async (pageSize = 10) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const url = new URL(`${BASE_URL}/api/phone/batch-calls`)
      if (pageSize) {
        url.searchParams.set('page_size', String(pageSize))
      }

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка batch calls')
      }

      const data: BatchCallsResponse = await response.json()
      set({ batchCalls: data.batch_calls })
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка batch calls')
    } finally {
      set({ isLoading: false })
    }
  },

  fetchBatchCall: async (id: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls/${id}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении данных batch call')
      }

      const data: BatchCallDetails = await response.json()
      return data
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении данных batch call')
      return null
    }
  },

  deleteBatchCall: async (id) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls/${id}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении batch call')
      }
      
      await useBatchCallsStore.getState().fetchBatchCalls()
      
      toast.success('Batch call успешно удален')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении batch call')
    } finally {
      set({ isLoading: false })
    }
  },

  updateBatchCall: async (id, data) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при обновлении batch call')
      }

      const updatedBatchCall = await response.json()
      
      set(state => ({
        batchCalls: state.batchCalls.map(batchCall => 
          batchCall.id === id ? { ...batchCall, ...updatedBatchCall } : batchCall
        )
      }))
      
      toast.success('Batch call успешно обновлен')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении batch call')
    } finally {
      set({ isLoading: false })
    }
  },

  createBatchCall: async (data) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании batch call')
      }

      const result: CreateBatchCallResponse = await response.json()
      await useBatchCallsStore.getState().fetchBatchCalls()
      toast.success('Batch call успешно создан')
      return result.batch_call_id
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании batch call')
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  cancelBatchCall: async (id: string) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls/${id}/cancel`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при отмене batch call')
      }

      // Обновляем список batch calls после отмены
      await useBatchCallsStore.getState().fetchBatchCalls()
      
      toast.success('Групповой звонок успешно отменен')
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при отмене группового звонка')
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  createBatchCallNew: async (data: CreateBatchCallRequestData) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/batch-calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании группового звонка')
      }

      const result: CreateBatchCallResponse = await response.json()
      await useBatchCallsStore.getState().fetchBatchCalls()
      toast.success('Групповой звонок успешно создан')
      return result.batch_call_id
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании группового звонка')
      return null
    } finally {
      set({ isLoading: false })
    }
  }
})) 