import { create } from 'zustand'
import { RegisterFormData, RegisterFirstStepData, RegisterSecondStepData } from '@/lib/validations/auth'

interface RegisterStore {
  step: number
  isLoading: boolean
  firstStepData: Partial<RegisterFirstStepData>
  secondStepData: Partial<RegisterSecondStepData>
  setFirstStepData: (data: RegisterFirstStepData) => void
  setSecondStepData: (data: RegisterSecondStepData) => void
  setLoading: (isLoading: boolean) => void
  nextStep: () => void
  prevStep: () => void
  register: () => Promise<{ success: boolean; error?: string; email?: string }>
}

export const useRegisterStore = create<RegisterStore>((set, get) => ({
  step: 1,
  isLoading: false,
  firstStepData: {},
  secondStepData: {},
  setFirstStepData: (data) => set({ firstStepData: data }),
  setSecondStepData: (data) => set({ secondStepData: data }),
  setLoading: (isLoading) => set({ isLoading }),
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: state.step - 1 })),
  register: async () => {
    try {
      set({ isLoading: true })
      const { firstStepData, secondStepData } = get()
      const data: RegisterFormData = {
        ...(firstStepData as RegisterFirstStepData),
        ...(secondStepData as RegisterSecondStepData)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Ошибка при регистрации' }
      }

      return { success: true, email: firstStepData.email }
    } catch {
      return { success: false, error: 'Произошла ошибка при отправке запроса' }
    } finally {
      set({ isLoading: false })
    }
  },
})) 