import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

interface VoiceLabels {
  accent: string
  description: string
  age: string
  gender: string
  use_case: string
}

export interface Voice {
  voice_id: string
  name: string
  labels: VoiceLabels
  preview_url: string
}

interface VoiceStore {
  voices: Voice[]
  isLoading: boolean
  fetchVoices: () => Promise<void>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export const useVoiceStore = create<VoiceStore>((set) => ({
  voices: [],
  isLoading: false,

  fetchVoices: async () => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`${BASE_URL}/api/voices`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении списка голосов')
      }

      const data = await response.json()
      set({ voices: data })
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка голосов')
    } finally {
      set({ isLoading: false })
    }
  }
})) 