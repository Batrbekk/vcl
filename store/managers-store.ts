import { create } from 'zustand'
import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export interface Manager {
  _id: string
  email: string
  firstName: string
  lastName: string
  companyName: string
  role: string
  adminId: string
  createdAt: string
  updatedAt: string
  __v: number
}

export interface CreateManagerData {
  email: string
  firstName: string
  lastName: string
  password: string
}

interface ManagerStore {
  managers: Manager[]
  isLoading: boolean
  setManagers: (managers: Manager[]) => void
  fetchManagers: () => Promise<void>
  deleteManager: (id: string) => Promise<void>
  updateManager: (id: string, data: Partial<CreateManagerData>) => Promise<void>
  createManager: (data: CreateManagerData) => Promise<void>
}

export const useManagerStore = create<ManagerStore>((set) => ({
  managers: [],
  isLoading: false,
  setManagers: (managers) => set({ managers }),
  
  fetchManagers: async () => {
    try {
      set({ isLoading: true })
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/managers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': '*/*'
        }
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при получении списка менеджеров')
      }
      
      const managers = await response.json()
      set({ managers })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при получении списка менеджеров')
    } finally {
      set({ isLoading: false })
    }
  },

  deleteManager: async (id) => {
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/managers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': '*/*'
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении менеджера')
      }

      await useManagerStore.getState().fetchManagers()
      toast.success('Менеджер успешно удален')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении менеджера')
    }
  },

  updateManager: async (id, data) => {
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/managers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': '*/*'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при обновлении менеджера')
      }

      await useManagerStore.getState().fetchManagers()
      toast.success('Менеджер успешно обновлен')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении менеджера')
    }
  },

  createManager: async (data) => {
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/managers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании менеджера')
      }

      await useManagerStore.getState().fetchManagers()
      toast.success('Менеджер успешно создан')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании менеджера')
      throw error
    }
  }
})) 