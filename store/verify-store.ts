import { create } from 'zustand'
import { toast } from 'sonner'

interface VerifyStore {
  isLoading: boolean
  error: string | null
  canResend: boolean
  timeLeft: number
  verifyCode: (email: string, code: string, mode: 'register' | 'reset') => Promise<void>
  sendCode: (email: string, mode: 'register' | 'reset') => Promise<void>
  startTimer: () => void
}

export const useVerifyStore = create<VerifyStore>((set, get) => ({
  isLoading: false,
  error: null,
  canResend: true,
  timeLeft: 0,

  verifyCode: async (email: string, code: string, mode: 'register' | 'reset') => {
    try {
      set({ isLoading: true, error: null })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, mode }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка при проверке кода')
      }

      toast.success('Верификация пройдена успешно')
      
      if (mode === 'register') {
        window.location.href = '/'
      } else if (mode === 'reset') {
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}`
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка'
      set({ error: message })
      toast.error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  sendCode: async (email: string, mode: 'register' | 'reset') => {
    try {
      set({ isLoading: true, error: null })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mode }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка при отправке кода')
      }

      toast.success('Код успешно отправлен')
      set({ canResend: false, timeLeft: 60 })
      get().startTimer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка'
      set({ error: message })
      toast.error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  startTimer: () => {
    const timer = setInterval(() => {
      set((state) => {
        if (state.timeLeft <= 1) {
          clearInterval(timer)
          return { ...state, canResend: true, timeLeft: 0 }
        }
        return { ...state, timeLeft: state.timeLeft - 1 }
      })
    }, 1000)
  },
})) 