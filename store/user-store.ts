import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"
import { useAuthStore } from "./auth-store"

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

interface UpdateProfileData {
  firstName: string
  lastName: string
  companyName: string
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

interface UserState {
  user: User | null
  isLoading: boolean
  fetchUser: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<boolean>
  changePassword: (data: ChangePasswordData) => Promise<boolean>
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      fetchUser: async () => {
        try {
          set({ isLoading: true })
          const token = useAuthStore.getState().token
          
          if (!token) {
            throw new Error('Не авторизован')
          }

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
      updateProfile: async (data: UpdateProfileData) => {
        try {
          const token = useAuthStore.getState().token
          
          if (!token) {
            throw new Error('Не авторизован')
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/profile`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
          })

          const result = await response.json()

          if (response.status === 200) {
            toast.success("Профиль успешно обновлен")
            // Обновляем данные пользователя после успешного изменения
            await get().fetchUser()
            return true
          } else {
            toast.error(result.message || "Произошла ошибка при обновлении профиля")
            return false
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Произошла ошибка при обновлении профиля")
          return false
        }
      },
      changePassword: async (data: ChangePasswordData) => {
        try {
          const token = useAuthStore.getState().token
          
          if (!token) {
            throw new Error('Не авторизован')
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/change-password`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
          })

          const result = await response.json()

          if (response.status === 200) {
            toast.success("Пароль успешно изменен")
            // Обновляем данные пользователя после успешного изменения
            await get().fetchUser()
            return true
          } else {
            toast.error(result.message || "Произошла ошибка при изменении пароля")
            return false
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Произошла ошибка при изменении пароля")
          return false
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