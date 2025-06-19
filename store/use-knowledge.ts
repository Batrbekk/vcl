import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export interface DependentAgent {
  id: string
  name: string
  type: string
  created_at_unix_secs: number
  access_level: string
}

export interface KnowledgeDocument {
  id: string
  name: string
  type: string
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
  dependent_agents: DependentAgent[]
  url?: string
  extracted_inner_html?: string
}

export interface KnowledgeResponse {
  message: string
  documents: KnowledgeDocument[]
  next_cursor: string | null
  has_more: boolean
  retrieved_at: string
}

export interface RagIndexModel {
  model: string
  used_bytes: number
}

export interface RagIndexInfo {
  total_used_bytes: number
  total_max_bytes: number
  models: RagIndexModel[]
}

interface KnowledgeStore {
  documents: KnowledgeDocument[]
  currentDocument?: KnowledgeDocument
  ragIndex: RagIndexInfo | null
  isLoading: boolean
  error: string | null
  fetchDocuments: () => Promise<void>
  fetchDocument: (id: string) => Promise<KnowledgeDocument | null>
  fetchRagIndex: () => Promise<void>
  addUrlDocument: (url: string) => Promise<void>
  addFileDocument: (file: File) => Promise<void>
  addTextDocument: (name: string, content: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'Неизвестная ошибка'
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useKnowledge = create<KnowledgeStore>((set) => ({
  documents: [],
  currentDocument: undefined,
  ragIndex: null,
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка документов')
      }

      const data: KnowledgeResponse = await response.json()
      set({ documents: data.documents || [], isLoading: false })
    } catch (error) {
      const errorMessage = handleApiError(error)
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
    }
  },

  fetchDocument: async (id: string) => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base/${id}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении документа')
      }

      const document: KnowledgeDocument = await response.json()
      set({ currentDocument: document })
      return document
    } catch (error) {
      const errorMessage = handleApiError(error)
      toast.error(errorMessage)
      return null
    }
  },

  fetchRagIndex: async () => {
    try {
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base/rag-index`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении информации о RAG индексе')
      }

      const data: RagIndexInfo = await response.json()
      set({ ragIndex: data })
    } catch (error) {
      const errorMessage = handleApiError(error)
      console.error('Ошибка получения RAG индекса:', errorMessage)
    }
  },

  addUrlDocument: async (url: string) => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Ошибка при добавлении URL')
      }

      // Обновляем список документов и RAG индекс
      await useKnowledge.getState().fetchDocuments()
      await useKnowledge.getState().fetchRagIndex()
      toast.success('URL успешно добавлен')
    } catch (error) {
      const errorMessage = handleApiError(error)
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
    }
  },

  addFileDocument: async (file: File) => {
    try {
      // Проверка размера файла (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Файл слишком большой. Максимальный размер: 10MB')
      }

      // Проверка типа файла
      const allowedTypes = ['.epub', '.pdf', '.docx', '.txt', '.html']
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedTypes.includes(fileExtension)) {
        throw new Error('Неподдерживаемый формат файла')
      }

      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base/file`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Ошибка при загрузке файла')
      }

      // Обновляем список документов и RAG индекс
      await useKnowledge.getState().fetchDocuments()
      await useKnowledge.getState().fetchRagIndex()
      toast.success('Файл успешно загружен')
    } catch (error) {
      const errorMessage = handleApiError(error)
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
    }
  },

  addTextDocument: async (name: string, content: string) => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base/text`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: content, name })
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании документа')
      }

      // Обновляем список документов и RAG индекс
      await useKnowledge.getState().fetchDocuments()
      await useKnowledge.getState().fetchRagIndex()
      toast.success('Документ успешно создан')
    } catch (error) {
      const errorMessage = handleApiError(error)
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
    }
  },

  deleteDocument: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/agents/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении документа')
      }

      // Обновляем список документов и RAG индекс
      await useKnowledge.getState().fetchDocuments()
      await useKnowledge.getState().fetchRagIndex()
      toast.success('Документ успешно удален')
    } catch (error) {
      const errorMessage = handleApiError(error)
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
    }
  },
})) 