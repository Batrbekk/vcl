import { useState } from "react"
import { useAgentStore } from "@/store/agent-store"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Trash2, Users2, Copy, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateAgentDialog } from "./create-agent-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="h-12 w-12 text-gray-400 mb-4">
      <Users2 className="h-12 w-12" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      Агенты не найдены
    </h3>
    <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
      Измените параметры фильтрации или добавьте нового агента
    </p>
  </div>
)

export function AgentTable() {
  const router = useRouter()
  const { 
    agents, 
    createAgent, 
    deleteAgent,
  } = useAgentStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [sortField, setSortField] = useState<"name" | "createdAt" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const itemsPerPage = 10

    const filteredAgents = agents?.filter(agent => 
    agent?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (!sortField) return 0
    
    if (sortField === "name") {
      const comparison = a.name.localeCompare(b.name, 'ru')
      return sortDirection === "asc" ? comparison : -comparison
    }
    
    if (sortField === "createdAt") {
      const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDirection === "asc" ? comparison : -comparison
    }
    
    return 0
  })

  const totalPages = Math.ceil(sortedAgents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAgents = sortedAgents.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  const handleDeleteClick = (id: string, name: string) => {
    setAgentToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (agentToDelete) {
      await deleteAgent(agentToDelete.id)
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
    }
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("ID агента скопирован в буфер обмена")
    } catch {
      toast.error("Ошибка при копировании ID")
    }
  }

  const handleSort = (field: "name" | "createdAt") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleTestAgent = (id: string) => {
    router.push(`/dashboard/agents/${id}`)
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex gap-4">
            <Input
              placeholder="Поиск агентов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <CreateAgentDialog onSubmit={createAgent} />
        </div>
        <div className="rounded-md border relative min-h-[400px]">
          <EmptyState />
        </div>
      </div>
    )
  }

  const showNoResults = sortedAgents.length === 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 flex gap-4">
          <Input
            placeholder="Поиск агентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <CreateAgentDialog onSubmit={createAgent} />
      </div>

      <div className="rounded-md border relative min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="px-6 cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Имя агента
                  {sortField === "name" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="px-6">ID агента</TableHead>
              <TableHead 
                className="px-6 cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-2">
                  Создан
                  {sortField === "createdAt" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="px-6 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={4} className="h-[400px] p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              paginatedAgents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/agents/detail/${agent.id}`)}
                >
                  <TableCell className="font-medium px-6">{agent.name}</TableCell>
                  <TableCell className="px-6 font-mono text-sm">{agent.id}</TableCell>
                  <TableCell className="px-6">
                    {format(new Date(agent.createdAt), 'dd.MM.yyyy HH:mm', {
                      locale: ru
                    })}
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTestAgent(agent.elevenLabsAgentId)
                            }}
                            className="cursor-pointer"
                          >
                            <Icons.audioWaveform className="h-4 w-4" />
                            <span className="sr-only">Тестировать</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Тестировать агента
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyId(agent.id)
                            }}
                            className="cursor-pointer"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Копировать ID</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Копировать ID агента
                        </TooltipContent>
                      </Tooltip>          
                    
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(agent.id, agent.name)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Удалить</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Удалить агента
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!showNoResults && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Показано {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, sortedAgents.length)} из{" "}
            {sortedAgents.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Предыдущая
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Следующая
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить агента</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить агента &quot;{agentToDelete?.name}&quot;? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 text-white hover:bg-destructive/80 cursor-pointer"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 