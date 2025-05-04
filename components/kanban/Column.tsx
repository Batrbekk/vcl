import { Card as CardType } from '@/store/kanban-store'
import { Card } from './Card'
import { Droppable } from '@hello-pangea/dnd'

interface ColumnProps {
  title: string
  status: string
  cards: CardType[]
}

const columnColors = {
  'todo': 'bg-gray-50',
  'in-progress': 'bg-blue-50',
  'done': 'bg-green-50'
}

export function Column({ title, status, cards }: ColumnProps) {
  return (
    <div className={`rounded-lg p-4 ${columnColors[status as keyof typeof columnColors]}`}>
      <h2 className="font-semibold mb-4">{title}</h2>
      <Droppable droppableId={status}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-3 min-h-[200px] relative"
          >
            {cards.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Задачи отсутствуют</p>
              </div>
            )}
            {cards.map((card, index) => (
              <Card key={card.id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
} 