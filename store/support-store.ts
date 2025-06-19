import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export type SupportTicket = {
  clientName: string
  clientEmail: string
  problemType: string
  subject: string
  description: string
}

interface SupportStore {
  isLoading: boolean
  error: string | null
  submitTicket: (ticket: SupportTicket) => Promise<void>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useSupportStore = create<SupportStore>((set) => ({
  isLoading: false,
  error: null,

  submitTicket: async (ticket: SupportTicket) => {
    try {
      set({ isLoading: true, error: null })
      
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }
      
      const response = await fetch(`${BASE_URL}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(ticket),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка при отправке обращения')
      }

      const result = await response.json()
      toast.success(result.message || 'Обращение успешно отправлено')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка'
      set({ error: message })
      toast.error(message)
    } finally {
      set({ isLoading: false })
    }
  },
})) 