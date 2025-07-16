import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export interface PhoneNumber {
  phone_number: string
  label: string
  phone_number_id: string
  assigned_agent: {
    agent_id: string
    agent_name: string
  } | null
  provider: string
  provider_config: {
    address: string
    transport: string
    media_encryption: string
    headers: Record<string, string>
    has_auth_credentials: boolean
    username: string
    has_outbound_trunk: boolean
  }
}

export interface OutboundCallRequest {
  agent_id: string
  agent_phone_number_id: string
  to_number: string
}

export interface OutboundCallResponse {
  message: string
  success: boolean
  conversation_id: string
  to_number: string
  callSid?: string // для Twilio
  sip_call_id?: string // для SIP trunk
}

export interface PhoneNumbersResponse {
  success: boolean
  data: PhoneNumber[]
  count: number
}

interface PhoneStore {
  phoneNumbers: PhoneNumber[]
  isLoading: boolean
  setPhoneNumbers: (phoneNumbers: PhoneNumber[]) => void
  fetchPhoneNumbers: () => Promise<void>
  deletePhoneNumber: (phoneNumberId: string) => Promise<void>
  createTwilioPhoneNumber: (data: {
    phoneNumber: string
    label: string
    sid: string
    token: string
  }) => Promise<{ success: boolean; phoneNumber?: PhoneNumber; error?: string }>
  createSipTrunkPhoneNumber: (data: {
    phoneNumber: string
    label: string
    address: string
    origination_uri: string
    credentials: {
      username: string
      password: string
    }
    media_encryption: string
    headers: Record<string, string>
    transport: string
  }) => Promise<{ success: boolean; phoneNumber?: PhoneNumber; error?: string }>
  fetchPhoneNumberDetails: (phoneNumberId: string) => Promise<PhoneNumber | null>
  assignAgentToPhoneNumber: (phoneNumberId: string, agentId: string) => Promise<{ success: boolean; error?: string }>
  makeOutboundCallTwilio: (data: OutboundCallRequest) => Promise<{ success: boolean; data?: OutboundCallResponse; error?: string }>
  makeOutboundCallSipTrunk: (data: OutboundCallRequest) => Promise<{ success: boolean; data?: OutboundCallResponse; error?: string }>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const usePhoneStore = create<PhoneStore>((set, get) => ({
  phoneNumbers: [],
  isLoading: false,
  setPhoneNumbers: (phoneNumbers) => set({ phoneNumbers }),
  
  fetchPhoneNumbers: async () => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/numbers`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка номеров телефонов')
      }

      const responseData: PhoneNumbersResponse = await response.json()
      // Маппинг: если приходит id, то делаем phone_number_id
      const mappedData = (responseData.data || []).map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          return {
            ...obj,
            phone_number_id: obj.phone_number_id || obj.id
          } as PhoneNumber
        }
        return item as PhoneNumber
      })
      set({ phoneNumbers: mappedData })
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка номеров телефонов')
    } finally {
      set({ isLoading: false })
    }
  },

  deletePhoneNumber: async (phoneNumberId) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/phone/numbers/${phoneNumberId}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении номера телефона')
      }

      // Обновляем список номеров, удаляя удаленный номер
      const currentPhoneNumbers = get().phoneNumbers
      set({ 
        phoneNumbers: currentPhoneNumbers.filter(phone => phone.phone_number_id !== phoneNumberId) 
      })
      
      toast.success('Номер телефона успешно удален')
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении номера телефона')
      throw error
    }
  },

  createTwilioPhoneNumber: async (data) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        return { success: false, error: 'Не авторизован' }
      }

      const response = await fetch(`${BASE_URL}/api/phone/numbers`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          label: data.label,
          sid: data.sid,
          token: data.token,
          provider: 'twilio'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.message || 'Ошибка при создании номера телефона' 
        }
      }

      const responseData = await response.json()
      
      // Создаем объект PhoneNumber из ответа
      const newPhoneNumber: PhoneNumber = {
        phone_number_id: responseData.data?.id || responseData.phone_number_id,
        phone_number: responseData.data?.phoneNumber || responseData.phone_number,
        label: responseData.data?.label || responseData.label,
        provider: responseData.data?.provider || responseData.provider,
        assigned_agent: null,
        provider_config: {
          address: '',
          transport: '',
          media_encryption: '',
          headers: {},
          has_auth_credentials: true,
          username: '',
          has_outbound_trunk: false
        }
      }

      // Обновляем список номеров, добавляя новый номер
      const currentPhoneNumbers = get().phoneNumbers
      set({ 
        phoneNumbers: [...currentPhoneNumbers, newPhoneNumber] 
      })
      
      toast.success('Номер телефона Twilio успешно создан')
      return { success: true, phoneNumber: newPhoneNumber }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании номера телефона'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  createSipTrunkPhoneNumber: async (data) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        return { success: false, error: 'Не авторизован' }
      }

      const response = await fetch(`${BASE_URL}/api/phone/numbers`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          label: data.label,
          address: data.address,
          origination_uri: data.origination_uri,
          provider: 'sip_trunk',
          username: data.credentials.username || undefined,
          password: data.credentials.password || undefined,
          media_encryption: data.media_encryption,
          headers: data.headers,
          transport: data.transport
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.message || 'Ошибка при создании SIP trunk номера' 
        }
      }

      const responseData = await response.json()
      
      // Создаем объект PhoneNumber из ответа
      const newPhoneNumber: PhoneNumber = {
        phone_number_id: responseData.data?.id || responseData.phone_number_id,
        phone_number: responseData.data?.phoneNumber || responseData.phone_number,
        label: responseData.data?.label || responseData.label,
        provider: responseData.data?.provider || responseData.provider,
        assigned_agent: null,
        provider_config: {
          address: data.address,
          transport: data.transport,
          media_encryption: data.media_encryption,
          headers: data.headers,
          has_auth_credentials: Boolean(data.credentials.username),
          username: data.credentials.username,
          has_outbound_trunk: true
        }
      }

      // Обновляем список номеров, добавляя новый номер
      const currentPhoneNumbers = get().phoneNumbers
      set({ 
        phoneNumbers: [...currentPhoneNumbers, newPhoneNumber] 
      })
      
      toast.success('SIP Trunk номер успешно создан')
      return { success: true, phoneNumber: newPhoneNumber }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании SIP trunk номера'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  fetchPhoneNumberDetails: async (phoneNumberId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        toast.error('Не авторизован')
        return null
      }

      const response = await fetch(`${BASE_URL}/api/phone/numbers/${phoneNumberId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Ошибка при получении деталей номера')
        return null
      }

      const phoneNumberData = await response.json()
      return phoneNumberData as PhoneNumber
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при получении деталей номера'
      toast.error(errorMessage)
      return null
    }
  },

  assignAgentToPhoneNumber: async (phoneNumberId: string, agentId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        return { success: false, error: 'Не авторизован' }
      }

                    const response = await fetch(`${BASE_URL}/api/phone/numbers/${phoneNumberId}/assign-agent`, {
         method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.message || 'Ошибка при назначении агента к номеру телефона' 
        }
      }

      toast.success('Агент успешно назначен к номеру телефона')
      return { success: true }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при назначении агента к номеру телефона'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  makeOutboundCallTwilio: async (data) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        return { success: false, error: 'Не авторизован' }
      }

      const response = await fetch(`${BASE_URL}/api/phone/outbound-call/twilio`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.message || 'Ошибка при инициации исходящего звонка через Twilio' 
        }
      }

      const responseData: OutboundCallResponse = await response.json()
      
      // Проверяем success в ответе API
      if (!responseData.success) {
        return { 
          success: false, 
          error: responseData.message || 'Ошибка при инициации исходящего звонка через Twilio' 
        }
      }
      
      toast.success('Исходящий звонок через Twilio успешно инициирован')
      return { success: true, data: responseData }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при инициации исходящего звонка через Twilio'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  makeOutboundCallSipTrunk: async (data) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        return { success: false, error: 'Не авторизован' }
      }

      const response = await fetch(`${BASE_URL}/api/phone/outbound-call/sip-trunk`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.message || 'Ошибка при инициации исходящего звонка через SIP trunk' 
        }
      }

      const responseData: OutboundCallResponse = await response.json()
      
      // Проверяем success в ответе API
      if (!responseData.success) {
        return { 
          success: false, 
          error: responseData.message || 'Ошибка при инициации исходящего звонка через SIP trunk' 
        }
      }
      
      toast.success('Исходящий звонок через SIP trunk успешно инициирован')
      return { success: true, data: responseData }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при инициации исходящего звонка через SIP trunk'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }
})) 