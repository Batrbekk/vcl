import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type CardStatus = 'todo' | 'in-progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Card {
  id: string
  title: string
  description: string
  status: CardStatus
  priority: Priority
  assignee?: string
  dueDate?: string
}

interface KanbanState {
  cards: Card[]
  isLoading: boolean
  selectedCard: Card | null
  setSelectedCard: (card: Card | null) => void
  moveCard: (cardId: string, newStatus: CardStatus) => void
  fetchCards: () => Promise<void>
  createCard: (card: Omit<Card, 'id'>) => void
}

const mockCards: Card[] = []

export const useKanbanStore = create(
  immer<KanbanState>((set) => ({
    cards: [],
    isLoading: false,
    selectedCard: null,
    setSelectedCard: (card) => set({ selectedCard: card }),
    moveCard: (cardId, newStatus) =>
      set((state) => {
        const cardIndex = state.cards.findIndex((card: Card) => card.id === cardId)
        if (cardIndex !== -1) {
          state.cards[cardIndex].status = newStatus
        }
      }),
    createCard: (card) =>
      set((state) => {
        const newCard = {
          ...card,
          id: Math.random().toString(36).substr(2, 9)
        }
        state.cards.push(newCard)
      }),
    fetchCards: async () => {
      set({ isLoading: true })
      // Имитация загрузки данных
      await new Promise((resolve) => setTimeout(resolve, 1000))
      set({ cards: mockCards, isLoading: false })
    }
  }))
) 