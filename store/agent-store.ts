import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

// Утилита для создания глубокого diff между объектами
function createDeepDiff(original: Record<string, unknown>, updated: Record<string, unknown>): Record<string, unknown> | undefined {
  if (original === updated) return undefined
  
  const diff: Record<string, unknown> = {}
  let hasChanges = false
  
  for (const key in updated) {
    const originalValue = original[key]
    const updatedValue = updated[key]
    
    if (originalValue !== updatedValue) {
      if (typeof updatedValue === 'object' && updatedValue !== null && !Array.isArray(updatedValue) &&
          typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue)) {
        const nestedDiff = createDeepDiff(
          originalValue as Record<string, unknown>, 
          updatedValue as Record<string, unknown>
        )
        if (nestedDiff !== undefined) {
          diff[key] = nestedDiff
          hasChanges = true
        }
      } else {
        diff[key] = updatedValue
        hasChanges = true
      }
    }
  }
  
  return hasChanges ? diff : undefined
}

export interface Agent {
  id: string
  name: string
  description: string
  voiceId: string
  language: string
  gender: string
  greetingTemplate: string
  fallbackTemplate: string
  summaryTemplate: string
  phoneNumber: string
  isActive: boolean
  integratedWithAi: boolean
  aiModel: string
  aiContextPrompt: string
  elevenLabsAgentId: string
  voiceStability: number
  voiceSimilarityBoost: number
  voiceStyle: number
  voiceUseSpeakerBoost: boolean
  voiceSpeed: number
  allowedHoursStart: string
  allowedHoursEnd: string
  allowedHoursTimezone: string
  adminId: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface AgentDetails extends Agent {
  conversation_config: {
    asr: {
      quality: string
      provider: string
      user_input_audio_format: string
      keywords: string[]
    }
    turn: {
      turn_timeout: number
      silence_end_call_timeout: number
      mode: string
    }
    tts: {
      model_id: string
      voice_id: string
      supported_voices: string[]
      agent_output_audio_format: string
      optimize_streaming_latency: number
      stability: number
      speed: number
      similarity_boost: number
      pronunciation_dictionary_locators: string[]
    }
    conversation: {
      text_only: boolean
      max_duration_seconds: number
      client_events: string[]
    }
    language_presets: Record<string, unknown>
    agent: {
      first_message: string
      language: string
      dynamic_variables: {
        dynamic_variable_placeholders: Record<string, unknown>
      }
      prompt: {
        prompt: string
        llm: string
        temperature: number
        max_tokens: number
        tools: Array<{
          id: string
          name: string
          description: string
          response_timeout_secs: number
          type: string
          params: Record<string, unknown>
        }>
        tool_ids: string[]
        mcp_server_ids: string[]
        native_mcp_server_ids: string[]
        knowledge_base: Array<{ id: string; name?: string; type?: string; usage_mode?: string }> | string[]
        custom_llm: unknown
        ignore_default_personality: boolean
        rag: {
          enabled: boolean
          embedding_model: string
          max_vector_distance: number
          max_documents_length: number
          max_retrieved_rag_chunks_count: number
        }
      }
    }
  }
  metadata: {
    created_at_unix_secs: number
  }
  platform_settings: Record<string, unknown>
  phone_numbers: string[]
  synced: boolean
  synced_at: string
}

export interface LLMPrice {
  llm: string
  price_per_minute: number
}

export interface LLMPricesResponse {
  success: boolean
  data: {
    llm_prices: LLMPrice[]
  }
}

export interface KnowledgeBaseDocument {
  id: string
  name: string
  metadata: {
    created_at_unix_secs: number
    last_updated_at_unix_secs: number
    size_bytes: number
  }
  supported_usages: string[]
  access_info: {
    is_creator: boolean
    creator_name: string
    creator_email: string
    role: string
  }
  dependent_agents: Array<{
    id: string
    name: string
    type: string
    created_at_unix_secs: number
    access_level: string
  }>
  type: string
  url?: string
}

export interface KnowledgeBaseResponse {
  success: boolean
  data: {
    documents: KnowledgeBaseDocument[]
    next_cursor: string | null
    has_more: boolean
  }
}

export interface AgentsResponse {
  success: boolean
  data: Agent[]
  count: number
}

export interface CreateAgentData {
  name: string
}

export interface CreateAgentResponse {
  message: string
  agent_id: string
  synced: boolean
  synced_at: string
  created_at: string
}

interface AgentStore {
  agents: Agent[]
  isLoading: boolean
  setAgents: (agents: Agent[]) => void
  fetchAgents: (pageSize?: number, sync?: boolean) => Promise<void>
  fetchAgent: (id: string, sync?: boolean) => Promise<AgentDetails | null>
  deleteAgent: (id: string) => Promise<void>
  updateAgent: (id: string, data: Partial<CreateAgentData>) => Promise<void>
  updateAgentDetails: (id: string, data: Partial<AgentDetails>) => Promise<AgentDetails | null>
  updateAgentPartial: (id: string, originalData: AgentDetails, updatedData: AgentDetails) => Promise<AgentDetails | null>
  createAgent: (data: CreateAgentData) => Promise<string | null>
  fetchLLMPrices: (agentId: string) => Promise<LLMPrice[]>
  fetchKnowledgeBase: (pageSize?: number) => Promise<KnowledgeBaseDocument[]>
  fetchConversationSignedUrl: (agentId: string) => Promise<string | null>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  isLoading: false,
  setAgents: (agents) => set({ agents }),
  
  fetchAgents: async (pageSize = 10, sync = true) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const url = new URL(`${BASE_URL}/api/agents`)
      url.searchParams.set('page_size', String(pageSize))
      url.searchParams.set('sync', String(sync))

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка агентов')
      }

      const data: AgentsResponse = await response.json()
      set({ agents: data.data })
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка агентов')
    } finally {
      set({ isLoading: false })
    }
  },

  fetchAgent: async (id: string, sync = true) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const url = new URL(`${BASE_URL}/api/agents/${id}`)
      url.searchParams.set('sync', String(sync))

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении данных агента')
      }

      const result = await response.json()
      
      // Обрабатываем новую структуру ответа
      if (result.success && result.data) {
        const baseAgent: Agent = result.data
        
        // Создаем полную структуру AgentDetails с дефолтными значениями
        const agentDetails: AgentDetails = {
          ...baseAgent,
          conversation_config: {
            asr: { quality: "high", provider: "default", user_input_audio_format: "wav", keywords: [] },
            turn: { turn_timeout: 30, silence_end_call_timeout: 10, mode: "auto" },
            tts: { 
              model_id: "default", 
              voice_id: baseAgent.voiceId || "default", 
              supported_voices: [], 
              agent_output_audio_format: "wav", 
              optimize_streaming_latency: 1,
              stability: baseAgent.voiceStability || 0.5, 
              speed: baseAgent.voiceSpeed || 1, 
              similarity_boost: baseAgent.voiceSimilarityBoost || 0.5, 
              pronunciation_dictionary_locators: []
            },
            conversation: { text_only: false, max_duration_seconds: 600, client_events: [] },
            language_presets: {},
            agent: {
              first_message: baseAgent.greetingTemplate || "Hello! How can I help you today?",
              language: baseAgent.language || "en",
              dynamic_variables: { dynamic_variable_placeholders: {} },
              prompt: {
                prompt: baseAgent.aiContextPrompt || "You are a helpful assistant.",
                llm: baseAgent.aiModel || "gpt-3.5-turbo",
                temperature: 0.5,
                max_tokens: 1000,
                tools: [],
                tool_ids: [],
                mcp_server_ids: [],
                native_mcp_server_ids: [],
                knowledge_base: [],
                custom_llm: null,
                ignore_default_personality: false,
                rag: { enabled: false, embedding_model: "default", max_vector_distance: 0.5, max_documents_length: 1000, max_retrieved_rag_chunks_count: 10 }
              }
            }
          },
          metadata: {
            created_at_unix_secs: Math.floor(new Date(baseAgent.createdAt).getTime() / 1000)
          },
          platform_settings: {},
          phone_numbers: baseAgent.phoneNumber ? [baseAgent.phoneNumber] : [],
          synced: true,
          synced_at: new Date().toISOString()
        }
        
        return agentDetails
      }
      
      // Fallback для старой структуры
      const data: AgentDetails = result
      return data
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении данных агента')
      return null
    }
  },

  deleteAgent: async (id) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении агента')
      }
      
      await useAgentStore.getState().fetchAgents()
      
      toast.success('Агент успешно удален')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении агента')
    } finally {
      set({ isLoading: false })
    }
  },

  updateAgent: async (id, data) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при обновлении агента')
      }

      const updatedAgent = await response.json()
      
      set(state => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { ...agent, ...updatedAgent } : agent
        )
      }))
      
      toast.success('Агент успешно обновлен')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении агента')
    } finally {
      set({ isLoading: false })
    }
  },

  updateAgentDetails: async (id, agentData) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      // Отправляем весь объект агента (кроме служебных полей)
      const dataToSend = {
        name: agentData.name,
        conversation_config: agentData.conversation_config,
        platform_settings: agentData.platform_settings,
        phone_numbers: agentData.phone_numbers || []
      }

      const response = await fetch(`${BASE_URL}/api/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        throw new Error('Ошибка при обновлении данных агента')
      }

      const updatedAgent: AgentDetails = await response.json()
      
      // Обновляем агента в списке если он там есть
      set(state => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { 
            ...agent, 
            name: updatedAgent.name
          } : agent
        )
      }))
      
      toast.success('Данные агента успешно обновлены')
      return updatedAgent
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении данных агента')
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updateAgentPartial: async (id, originalData, updatedData) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      // Создаем diff только для измененных полей
      const changes = createDeepDiff(
        originalData as unknown as Record<string, unknown>, 
        updatedData as unknown as Record<string, unknown>
      )

      if (!changes || Object.keys(changes).length === 0) {
        toast.info('Нет изменений для сохранения')
        return originalData
      }

      const response = await fetch(`${BASE_URL}/api/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changes)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Ошибка при обновлении данных агента')
      }

      const result = await response.json()
      
      // Обрабатываем новую структуру ответа, если она есть
      let updatedAgent: AgentDetails
      if (result.success && result.data) {
        updatedAgent = {
          ...updatedData,
          ...result.data
        }
      } else {
        updatedAgent = {
          ...updatedData,
          ...result
        }
      }
      
      // Обновляем агента в списке если он там есть
      set(state => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { 
            ...agent, 
            ...updatedAgent
          } : agent
        )
      }))
      
      toast.success('Данные агента успешно обновлены')
      return updatedAgent
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении данных агента')
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  createAgent: async (data) => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании агента')
      }

      const result: CreateAgentResponse = await response.json()
      await useAgentStore.getState().fetchAgents()
      toast.success('Агент успешно создан')
      return result.agent_id
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании агента')
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  fetchLLMPrices: async (agentId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/llm-prices?agent_id=${agentId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка LLM моделей')
      }

      const data: LLMPricesResponse = await response.json()
      
      // Обрабатываем новую структуру ответа
      if (data.success && data.data) {
        return data.data.llm_prices
      }
      
      // Fallback для старой структуры (если нужно)
      return []
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка LLM моделей')
      return []
    }
  },

  fetchKnowledgeBase: async (pageSize = 30) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base?page_size=${pageSize}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении базы знаний')
      }

      const data: KnowledgeBaseResponse = await response.json()
      
      // Обрабатываем новую структуру ответа
      if (data.success && data.data) {
        return data.data.documents
      }
      
      // Fallback для старой структуры (если нужно)
      return []
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении базы знаний')
      return []
    }
  },

  fetchConversationSignedUrl: async (agentId: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/conversation/signed-url?agent_id=${agentId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении signed URL для разговора')
      }

      const data = await response.json()
      return data.signed_url
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении signed URL для разговора')
      return null
    }
  }
})) 