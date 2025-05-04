import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { CreateCard } from '@/components/kanban/CreateCard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen w-full p-6 relative">
      <h1 className="text-3xl font-bold mb-8">Добро пожаловать в панель управления</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full mb-10">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8 w-full">
          <h3 className="font-semibold mb-3">Активные сделки</h3>
          <p className="text-2xl font-bold">24</p>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8 w-full">
          <h3 className="font-semibold mb-3">Задачи на сегодня</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8 w-full">
          <h3 className="font-semibold mb-3">Звонки за неделю</h3>
          <p className="text-2xl font-bold">156</p>
        </div>
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Управление задачами</h2>
          <CreateCard />
        </div>
        <div className="w-full">
          <KanbanBoard />
        </div>
      </div>
    </div>
  )
} 