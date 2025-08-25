"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAgentStore } from "@/store/agent-store"
import { ArrowLeft, Trash2, Copy, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb"
import { Loader } from "@/components/ui/loader"
import { AgentTab } from "@/components/dashboard/agent-detail/agent-tab"
import { VoiceTab } from "@/components/dashboard/agent-detail/voice-tab"
import { AdvancedTab } from "@/components/dashboard/agent-detail/advanced-tab"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Icons } from "@/components/icons"
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
import type { AgentDetails } from "@/store/agent-store"
import { toast } from "sonner"

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { fetchAgent, deleteAgent, updateAgentPartial } = useAgentStore()
  const [agent, setAgent] = useState<AgentDetails | null>(null)
  const [originalAgent, setOriginalAgent] = useState<AgentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const agentId = params.id as string

  useEffect(() => {
    const loadAgent = async () => {
      if (!agentId) return
      
      setIsLoading(true)
      try {
        const agentData = await fetchAgent(agentId, true)
        setAgent(agentData)
        setOriginalAgent(agentData)
      } finally {
        setIsLoading(false)
      }
    }

    loadAgent()
  }, [agentId, fetchAgent])

  // Проверка изменений
  useEffect(() => {
    if (!agent || !originalAgent) return
    
    const hasChanges = JSON.stringify(agent) !== JSON.stringify(originalAgent)
    setHasChanges(hasChanges)
  }, [agent, originalAgent])

  // Обновление данных агента
  const updateAgent = useCallback((updatedData: Partial<AgentDetails>) => {
    if (!agent) return
    
    setAgent(prev => prev ? { ...prev, ...updatedData } : null)
  }, [agent])

  // Сохранение изменений
  const handleSaveChanges = async () => {
    if (!agent || !originalAgent || !hasChanges) return
    
    setIsSaving(true)
    try {
      // Используем новую функцию для частичного обновления
      const updatedAgent = await updateAgentPartial(agent.id, originalAgent, agent)
      if (updatedAgent) {
        setOriginalAgent(updatedAgent)
        setAgent(updatedAgent)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Отмена изменений
  const handleCancelChanges = () => {
    if (originalAgent) {
      setAgent(originalAgent)
    }
  }

  const handleDeleteAgent = async () => {
    if (!agent) return
    
    await deleteAgent(agent.id)
    setDeleteDialogOpen(false)
    router.push('/dashboard/agents')
  }

  const handleTestAgent = () => {
    if (!agent) return
    router.push(`/dashboard/agents/${agent.elevenLabsAgentId}`)
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("ID агента скопирован в буфер обмена")
    } catch {
      toast.error("Ошибка при копировании ID")
    }
  }

  if (isLoading) {
    return <Loader />
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h3 className="text-lg font-medium">Агент не найден</h3>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full mb-14">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Главная</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard/agents">Агенты</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="text-lg">
                    <BreadcrumbPage>
                      {agent.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-mono font-bold">
                  ID:
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyId(agent.id)}
                      className="h-7 px-2 font-mono text-sm cursor-pointer hover:bg-muted"
                    >
                      {agent.id}
                      <Copy className="h-3 w-3 ml-1" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Копировать ID агента
                  </TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleTestAgent}
                    className="gap-2 cursor-pointer"
                  >
                    <Icons.audioWaveform className="h-4 w-4" />
                    Протестировать агента
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Перейти к тестированию агента
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Удалить агента
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agent" className="cursor-pointer">Агент</TabsTrigger>
            <TabsTrigger value="voice" className="cursor-pointer">Голос</TabsTrigger>
            <TabsTrigger value="advanced" className="cursor-pointer">Дополнительно</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agent" className="mt-6">
            <AgentTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>
          
          <TabsContent value="voice" className="mt-6">
            <VoiceTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-6">
            <AdvancedTab agent={agent} onUpdate={updateAgent} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Save Panel */}
      {hasChanges && (
        <div className="fixed bottom-0 left-64 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                У вас есть несохраненные изменения
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelChanges}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отменить
                </Button>
                
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить агента</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить агента &quot;{agent.name}&quot;? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAgent}
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
