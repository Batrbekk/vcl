import { create } from 'zustand'
import { toast } from 'sonner'
import { ResetPasswordData } from '@/lib/validations/auth'

interface ResetStore {
  email: string
  isLoading: boolean
  setEmail: (email: string) => void
  resetPassword: (data: Omit<ResetPasswordData, 'email'>) => Promise<void>
  reset: () => void
}

export const useResetStore = create<ResetStore>((set) => ({
  email: '',
  isLoading: false,
  setEmail: (email) => set({ email }),
  resetPassword: async (data) => {
    try {
      set({ isLoading: true })
      const { email } = useResetStore.getState()
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword: data.newPassword
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ошибка при сбросе пароля')
      }

      toast.success('Пароль успешно изменен')
      window.location.href = '/'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка'
      toast.error(message)
    } finally {
      set({ isLoading: false })
    }
  },
  reset: () => set({ email: '', isLoading: false }),
})) 