"use client"

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useConversation } from "@11labs/react"
import { Button } from '@/components/ui/button'
import { useAgentStore } from '@/store/agent-store'

interface AnimatedGradientDiskProps {
  className?: string
  agentId: string
  onConversationStart?: (conversationId: string) => void
  onConversationEnd?: () => void
  onStopConversation?: (stopFn: () => Promise<void>) => void
}

async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    console.error("Microphone permission denied");
    return false;
  }
}

export function AnimatedGradientDisk({ 
  className, 
  agentId,
  onConversationStart,
  onConversationEnd,
  onStopConversation
}: AnimatedGradientDiskProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { fetchConversationSignedUrl } = useAgentStore()

  const getSignedUrl = async (): Promise<string> => {
    const signedUrl = await fetchConversationSignedUrl(agentId);
    if (!signedUrl) {
      throw new Error("Failed to get signed url");
    }
    return signedUrl;
  }

  const conversation = useConversation({
    onConnect: () => {
      console.log("connected");
    },
    onDisconnect: () => {
      console.log("disconnected");
    },
    onError: error => {
      console.log(error);
      alert("An error occurred during the conversation");
    },
    onMessage: message => {
      console.log(message);
    },
  });

  const startConversation = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert("Нет доступа к микрофону");
      return;
    }
    const signedUrl = await getSignedUrl();
    const conversationId = await conversation.startSession({ signedUrl });
    onConversationStart?.(conversationId);
  }

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    onConversationEnd?.();
  }, [conversation, onConversationEnd]);

  useEffect(() => {
    if (onStopConversation) {
      onStopConversation(stopConversation);
    }
  }, [stopConversation, onStopConversation]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    let animationFrameId: number
    let rotation = 0
    let pulseScale = 1

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height)
      
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const baseRadius = Math.min(centerX, centerY) * 0.65
      
      // Пульсация при активном звонке
      if (conversation.status === 'connected') {
        pulseScale = 1 + Math.sin(Date.now() / 500) * 0.05
      }
      
      const radius = baseRadius * pulseScale

      // Создаем градиент
      const gradient = ctx.createConicGradient(rotation, centerX, centerY)
      gradient.addColorStop(0, '#818cf8')    // indigo-400
      gradient.addColorStop(0.33, '#c084fc')  // purple-400
      gradient.addColorStop(0.66, '#60a5fa')  // blue-400
      gradient.addColorStop(1, '#818cf8')    // indigo-400

      // Рисуем диск с размытием
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.shadowColor = '#60a5fa'
      ctx.shadowBlur = 50
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.fill()
      ctx.restore()

      // Добавляем легкий блик
      const highlightGradient = ctx.createRadialGradient(
        centerX - radius * 0.5,
        centerY - radius * 0.5,
        0,
        centerX,
        centerY,
        radius
      )
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = highlightGradient
      ctx.fill()

      // Обновляем поворот с разной скоростью в зависимости от состояния
      rotation += conversation.status === 'connected' ? 0.02 : 0.01
      if (rotation >= Math.PI * 2) {
        rotation = 0
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [conversation.status])

  return (
    <div className={cn("relative w-full aspect-square", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {conversation.status !== 'connected' ? (
          <Button
            size="lg"
            className="rounded-full bg-white/50 hover:bg-white shadow-lg px-6 py-6 text-primary"
            onClick={startConversation}
            disabled={conversation.status === 'connecting'}
          >
            <div className="bg-primary p-2 rounded-full mr-2">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            {conversation.status === 'connecting' ? 'Подключение...' : 'Начать разговор'}
          </Button>
        ) : (
          <p className="text-sm font-medium rounded-full bg-white/50 shadow-lg px-4 py-2 text-primary">
            {conversation.isSpeaking ? 'Агент говорит...' : 'Говорите...'}
          </p>
        )}
      </div>
    </div>
  )
} 