'use client'

import { useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { useKanbanStore, CardStatus } from '@/store/kanban-store'
import { Column } from './Column'
import { Loader } from '@/components/ui/loader'

const columns = [
  { id: 'todo', title: 'К выполнению' },
  { id: 'in-progress', title: 'В процессе' },
  { id: 'done', title: 'Готово' }
]

export function KanbanBoard() {
  const { cards, isLoading, moveCard, fetchCards } = useKanbanStore()

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    moveCard(draggableId, destination.droppableId as CardStatus)
  }

  if (isLoading) {
    return <Loader />
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
        {columns.map((column) => (
          <Column
            key={column.id}
            title={column.title}
            status={column.id}
            cards={cards.filter((card) => card.status === column.id)}
          />
        ))}
      </div>
    </DragDropContext>
  )
} 