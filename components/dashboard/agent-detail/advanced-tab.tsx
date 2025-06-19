import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import type { AgentDetails } from "@/store/agent-store"

interface AdvancedTabProps {
  agent: AgentDetails
  onUpdate?: (updatedData: Partial<AgentDetails>) => void
}

export function AdvancedTab({ agent, onUpdate }: AdvancedTabProps) {
  const { conversation_config } = agent
  const { turn, conversation } = conversation_config

  const [turnTimeout, setTurnTimeout] = useState(turn.turn_timeout)
  const [silenceEndCallTimeout, setSilenceEndCallTimeout] = useState(turn.silence_end_call_timeout)
  const [maxDurationSeconds, setMaxDurationSeconds] = useState(conversation.max_duration_seconds)

  return (
    <div className="space-y-6">
      {/* Таймаут хода */}
      <Card>
        <CardHeader>
          <CardTitle>Таймаут хода</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Максимальное количество секунд с момента последнего сообщения пользователя. При превышении агент ответит и принудит к ходу. Значение -1 означает, что агент никогда не будет делать таймаут и всегда будет ждать ответа от пользователя.
            </p>
            <Input
              type="number"
              value={turnTimeout}
              onChange={(e) => {
                const newTimeout = Number(e.target.value)
                setTurnTimeout(newTimeout)
                onUpdate?.({
                  conversation_config: {
                    ...agent.conversation_config,
                    turn: {
                      ...agent.conversation_config.turn,
                      turn_timeout: newTimeout
                    }
                  }
                })
              }}
              placeholder="Введите значение в секундах"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таймаут завершения звонка при тишине */}
      <Card>
        <CardHeader>
          <CardTitle>Таймаут завершения звонка при тишине</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Максимальное количество секунд с момента последнего сообщения пользователя. При превышении звонок завершится. Значение -1 означает, что нет фиксированного таймаута.
            </p>
            <Input
              type="number"
              value={silenceEndCallTimeout}
              onChange={(e) => {
                const newSilenceTimeout = Number(e.target.value)
                setSilenceEndCallTimeout(newSilenceTimeout)
                onUpdate?.({
                  conversation_config: {
                    ...agent.conversation_config,
                    turn: {
                      ...agent.conversation_config.turn,
                      silence_end_call_timeout: newSilenceTimeout
                    }
                  }
                })
              }}
              placeholder="Введите значение в секундах"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Максимальная длительность разговора */}
      <Card>
        <CardHeader>
          <CardTitle>Максимальная длительность разговора</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Максимальное количество секунд, которое может длиться разговор.
            </p>
            <Input
              type="number"
              value={maxDurationSeconds}
              onChange={(e) => {
                const newMaxDuration = Number(e.target.value)
                setMaxDurationSeconds(newMaxDuration)
                onUpdate?.({
                  conversation_config: {
                    ...agent.conversation_config,
                    conversation: {
                      ...agent.conversation_config.conversation,
                      max_duration_seconds: newMaxDuration
                    }
                  }
                })
              }}
              placeholder="Введите значение в секундах"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 