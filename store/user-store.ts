import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"

type UserRole = 'admin' | 'manager'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  companyName: string
  isVerified: boolean
  role: UserRole
  createdAt: string
  updatedAt: string
}

interface UserState {
  user: User | null
  isLoading: boolean
  fetchUser: (token: string) => Promise<void>
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      fetchUser: async (token) => {
        try {
          set({ isLoading: true })
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          })

          const result = await response.json()

          switch (response.status) {
            case 200:
              set({ user: result })
              toast.success("Успешное получение данных")
              break
            case 401:
              toast.error("Ошибка авторизации")
              set({ user: null })
              break
            case 404:
              toast.error("Пользователь не найден")
              set({ user: null })
              break
            case 500:
              toast.error("Внутренняя ошибка сервера")
              set({ user: null })
              break
            default:
              toast.error(result.message || "Произошла ошибка")
              set({ user: null })
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Произошла ошибка")
          set({ user: null })
        } finally {
          set({ isLoading: false })
        }
      },
      clearUser: () => {
        set({ user: null })
      },
    }),
    {
      name: "user-storage",
    }
  )
) 