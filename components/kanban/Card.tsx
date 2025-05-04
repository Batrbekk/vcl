import { Card as CardType } from '@/store/kanban-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Draggable } from '@hello-pangea/dnd'
import { useKanbanStore } from '@/store/kanban-store'

interface CardProps {
  card: CardType
  index: number
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
}

export function Card({ card, index }: CardProps) {
  const setSelectedCard = useKanbanStore((state) => state.setSelectedCard)

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided) => (
        <Dialog>
          <DialogTrigger asChild>
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCard(card)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{card.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[card.priority]}`}>
                  {card.priority}
                </span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-2">{card.description}</p>
              {card.assignee && (
                <div className="mt-3 flex items-center text-gray-500 text-xs">
                  <span>Исполнитель: {card.assignee}</span>
                </div>
              )}
              {card.dueDate && (
                <div className="mt-1 text-gray-500 text-xs">
                  <span>Срок: {new Date(card.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{card.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Описание</h4>
                  <p className="text-gray-600">{card.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Приоритет</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[card.priority]}`}>
                      {card.priority}
                    </span>
                  </div>
                  {card.assignee && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Исполнитель</h4>
                      <span className="text-gray-600">{card.assignee}</span>
                    </div>
                  )}
                  {card.dueDate && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Срок</h4>
                      <span className="text-gray-600">
                        {new Date(card.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Draggable>
  )
} 