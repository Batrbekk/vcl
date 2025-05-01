import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"

interface AuthState {
  token: string | null
  isLoading: boolean
  login: (data: { email: string; password: string }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isLoading: false,
      login: async (data) => {
        try {
          set({ isLoading: true })
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.message || "Ошибка авторизации")
          }

          set({ token: result.token })
          toast.success("Успешная авторизация")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Ошибка авторизации")
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      logout: () => {
        set({ token: null })
        toast.success("Вы успешно вышли из системы")
      },
    }),
    {
      name: "auth-storage",
    }
  )
) 