"use client"

import { useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AnimatedGradientDisk } from '@/components/ui/animated-gradient-disk'
import { X, PhoneOff, History } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function AgentTestPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string
  const [hasCallEnded, setHasCallEnded] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const stopConversationRef = useRef<(() => Promise<void>) | null>(null)

  const handleConversationStart = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setHasCallEnded(false)
  }

  const handleConversationEnd = async () => {
    setHasCallEnded(true)
  }

  const handleStopConversation = useCallback(async () => {
    if (stopConversationRef.current) {
      await stopConversationRef.current();
    }
  }, [stopConversationRef]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Декоративный фоновый эффект */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25" />
      <div className="absolute inset-0 bg-gradient-radial from-blue-100/20 to-transparent dark:from-blue-900/20" />
      
      {/* Основной контент */}
      <div className="relative">
        {/* Верхняя панель с навигацией */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Панель управления</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/agents">Агенты</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Тестирование</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/agents')}
            className="rounded-full cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>

        {/* Центральный контент */}
        <div className="container max-w-screen-lg mx-auto pb-8">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="relative w-full max-w-2xl aspect-square p-16">
              <AnimatedGradientDisk 
                className="absolute inset-0"
                agentId={agentId}
                onConversationStart={handleConversationStart}
                onConversationEnd={handleConversationEnd}
                onStopConversation={(stopFn) => stopConversationRef.current = stopFn}
              />
            </div>

            {!hasCallEnded && currentConversationId && (
              <div className="-mt-8 z-10">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full shadow-lg cursor-pointer"
                  onClick={handleStopConversation}
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Завершить звонок
                </Button>
              </div>
            )}

            {hasCallEnded && (
              <div className="flex flex-col items-center gap-4 -mt-16 z-10">
                <p className="text-sm text-muted-foreground">
                  Звонок завершен
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full shadow-lg"
                  onClick={() => router.push('/dashboard/history')}
                >
                  <History className="mr-2 h-5 w-5" />
                  Перейти к истории звонков
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 