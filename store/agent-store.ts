import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export interface Agent {
  agent_id: string
  name: string
  tags: string[]
  created_at_unix_secs: number
  access_info: {
    is_creator: boolean
    creator_name: string
    creator_email: string
    role: string
  }
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
  message: string
  llm_prices: LLMPrice[]
  retrieved_at: string
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
  dependent_agents: string[]
  type: string
  url?: string
}

export interface KnowledgeBaseResponse {
  message: string
  documents: KnowledgeBaseDocument[]
  next_cursor: string | null
  has_more: boolean
  retrieved_at: string
}

export interface AgentsResponse {
  agents: Agent[]
  next_cursor: string | null
  has_more: boolean
  synced: boolean
  synced_at: string
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
      set({ agents: data.agents })
      
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

      const data: AgentDetails = await response.json()
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
          agent.agent_id === id ? { ...agent, ...updatedAgent } : agent
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
        phone_numbers: agentData.phone_numbers || [],
        tags: agentData.tags || []
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
          agent.agent_id === id ? { 
            ...agent, 
            name: updatedAgent.name,
            tags: updatedAgent.tags,
            access_info: updatedAgent.access_info
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
      return data.llm_prices
      
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
      return data.documents
      
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