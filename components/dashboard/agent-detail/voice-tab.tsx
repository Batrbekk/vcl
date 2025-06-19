import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useState, useEffect, useRef } from "react"
import { Volume2, Search, Play, Pause, ChevronDown, Check, HelpCircle } from "lucide-react"
import type { AgentDetails } from "@/store/agent-store"
import { useVoiceStore } from "@/store/voice-store"
import { cn } from "@/lib/utils"

interface VoiceTabProps {
  agent: AgentDetails
  onUpdate?: (updatedData: Partial<AgentDetails>) => void
}

// Переводы для тегов голосов
const TAG_TRANSLATIONS: Record<string, string> = {
  // Акценты
  'american': 'Американский',
  'british': 'Британский',
  'australian': 'Австралийский',
  'canadian': 'Канадский',
  'irish': 'Ирландский',
  'scottish': 'Шотландский',
  'south_african': 'Южноафриканский',
  'indian': 'Индийский',
  
  // Пол
  'male': 'Мужской',
  'female': 'Женский',
  'neutral': 'Нейтральный',
  
  // Назначение
  'conversational': 'Разговорный',
  'narration': 'Повествование',
  'news': 'Новости',
  'audiobook': 'Аудиокнига',
  'entertainment_tv': 'Развлечения и ТВ',
  'social_media': 'Социальные сети',
  'informative_educational': 'Образовательный',
  'narrative_story': 'Рассказ',
  'characters': 'Персонажи',
  'meditation': 'Медитация',
  'advertisement': 'Реклама',
  
  // Возраст
  'young': 'Молодой',
  'middle_aged': 'Средних лет',
  'old': 'Пожилой',
  'child': 'Детский',
  
  // Стили
  'calm': 'Спокойный',
  'energetic': 'Энергичный',
  'professional': 'Профессиональный',
  'friendly': 'Дружелюбный',
  'authoritative': 'Авторитетный',
  'warm': 'Теплый',
  'soothing': 'Успокаивающий',
  'dramatic': 'Драматичный',
  'cheerful': 'Веселый',
  'serious': 'Серьезный'
}

const translateTag = (tag: string): string => {
  return TAG_TRANSLATIONS[tag.toLowerCase()] || tag
}

const getTagColor = (): string => {
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function VoiceTab({ agent, onUpdate }: VoiceTabProps) {
  const { conversation_config } = agent
  const { tts } = conversation_config
  
  // Voice selection states
  const { voices, isLoading, fetchVoices } = useVoiceStore()
  const [selectedVoice, setSelectedVoice] = useState(tts.voice_id)
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("")
  const [isVoiceSelectOpen, setIsVoiceSelectOpen] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Voice settings states
  const [optimizeStreamingLatency, setOptimizeStreamingLatency] = useState(tts.optimize_streaming_latency || 0)
  const [stability, setStability] = useState(tts.stability || 0.5)
  const [speed, setSpeed] = useState(tts.speed || 1.0)
  const [similarity, setSimilarity] = useState(tts.similarity_boost || 0.5)

  useEffect(() => {
    fetchVoices()
  }, [fetchVoices])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVoiceSelectOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredVoices = voices.filter(voice => 
    voiceSearchQuery === "" || 
    voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
    voice.labels.accent.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
    voice.labels.gender.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
    voice.labels.use_case.toLowerCase().includes(voiceSearchQuery.toLowerCase())
  )

  const playVoicePreview = async (voiceId: string, previewUrl: string, event?: React.PointerEvent | React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    console.log('Attempting to play voice:', voiceId, previewUrl)
    
    if (playingVoice === voiceId) {
      // Остановить воспроизведение
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }
      setPlayingVoice(null)
      return
    }

    // Остановить предыдущий звук если играет
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }

    try {
      setPlayingVoice(voiceId)
      const audio = new Audio(previewUrl)
      setAudioElement(audio)
      
      audio.onended = () => {
        setPlayingVoice(null)
        setAudioElement(null)
      }
      
      audio.onerror = (e) => {
        setPlayingVoice(null)
        setAudioElement(null)
        console.error('Ошибка воспроизведения аудио:', e)
      }
      
      await audio.play()
      console.log('Audio started playing')
    } catch (error) {
      setPlayingVoice(null)
      setAudioElement(null)
      console.error('Ошибка воспроизведения аудио:', error)
    }
  }

  const selectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId)
    setIsVoiceSelectOpen(false)
    onUpdate?.({
      conversation_config: {
        ...agent.conversation_config,
        tts: {
          ...agent.conversation_config.tts,
          voice_id: voiceId
        }
      }
    })
  }

  const getSelectedVoice = () => {
    return voices.find(voice => voice.voice_id === selectedVoice)
  }

  return (
    <div className="space-y-6">
      {/* Выбор голоса */}
      <Card>
        <CardHeader>
          <CardTitle>Голос</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Выберите голос ElevenLabs, который вы хотите использовать для агента
            </p>
            <div className="relative" ref={dropdownRef}>
              {/* Trigger Button */}
              <button
                className="w-full p-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-between text-left"
                onClick={() => setIsVoiceSelectOpen(!isVoiceSelectOpen)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {getSelectedVoice() && (
                    <>
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                          <Volume2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium truncate">{getSelectedVoice()?.name}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                            {translateTag(getSelectedVoice()?.labels.accent || '')}
                          </Badge>
                          <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                            {translateTag(getSelectedVoice()?.labels.gender || '')}
                          </Badge>
                          <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                            {translateTag(getSelectedVoice()?.labels.use_case || '')}
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                  {!getSelectedVoice() && (
                    <span className="text-muted-foreground">
                      {isLoading ? "Загрузка..." : "Выберите голос"}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isVoiceSelectOpen && "rotate-180"
                )} />
              </button>

              {/* Dropdown Content */}
              {isVoiceSelectOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg min-w-[600px]">
                  {/* Поиск голосов */}
                  <div className="sticky top-0 p-3 bg-background border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Поиск голоса..."
                        value={voiceSearchQuery}
                        onChange={(e) => setVoiceSearchQuery(e.target.value)}
                        className="pl-10"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  
                  {/* Список голосов */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Загрузка голосов...
                      </div>
                    ) : filteredVoices.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Голоса не найдены
                      </div>
                    ) : (
                      <>
                        {voiceSearchQuery === "" && (
                          <div className="px-3 py-2 border-b">
                            <div className="text-sm font-medium text-muted-foreground">Недавние</div>
                          </div>
                        )}
                        {filteredVoices.map((voice) => (
                          <div
                            key={voice.voice_id}
                            className={cn(
                              "flex items-center w-full p-2 hover:bg-muted/50 group cursor-pointer",
                              selectedVoice === voice.voice_id && "bg-accent/50"
                            )}
                            onClick={() => selectVoice(voice.voice_id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="relative w-8 h-8 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg transition-all duration-200 group-hover:shadow-xl">
                                  <Volume2 className={cn(
                                    "w-3 h-3 text-white transition-all duration-200",
                                    playingVoice === voice.voice_id ? "animate-pulse" : ""
                                  )} />
                                </div>
                                <div
                                  className={cn(
                                    "absolute inset-0 w-8 h-8 rounded-full bg-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer z-10"
                                  )}
                                  onPointerDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    playVoicePreview(voice.voice_id, voice.preview_url, e)
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                >
                                  {playingVoice === voice.voice_id ? (
                                    <Pause className="w-3 h-3 text-white pointer-events-none" />
                                  ) : (
                                    <Play className="w-3 h-3 text-white pointer-events-none" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm mb-0.5 truncate">{voice.name}</div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                                    {translateTag(voice.labels.accent)}
                                  </Badge>
                                  <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                                    {translateTag(voice.labels.gender)}
                                  </Badge>
                                  <Badge className={cn("text-xs px-1.5 py-0.5", getTagColor())}>
                                    {translateTag(voice.labels.use_case)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {selectedVoice === voice.voice_id && (
                              <Check className="w-4 h-4" />
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimize streaming latency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Оптимизация задержки потока
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Настройте оптимизацию задержки для генерации речи. Задержка может быть оптимизирована за счет качества.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Настройте оптимизацию задержки для генерации речи. Задержка может быть оптимизирована за счет качества.
            </p>
            
            <div className="mb-4">
              <Slider
                min={0}
                max={4}
                step={1}
                value={[optimizeStreamingLatency]}
                onValueChange={(value) => {
                  const newLatency = value[0]
                  setOptimizeStreamingLatency(newLatency)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      tts: {
                        ...agent.conversation_config.tts,
                        optimize_streaming_latency: newLatency
                      }
                    }
                  })
                }}
                className="w-full"
              />
              <div className="text-right mt-1">
                <span className="text-sm text-muted-foreground">
                  {optimizeStreamingLatency}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Стабильность
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Более высокие значения сделают речь более последовательной, но это также может сделать ее монотонной. Более низкие значения сделают речь более выразительной, но могут привести к нестабильности.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Более высокие значения сделают речь более последовательной, но это также может сделать ее монотонной. Более низкие значения сделают речь более выразительной, но могут привести к нестабильности.
            </p>
            
            <div className="mb-4">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[stability]}
                onValueChange={(value) => {
                  const newStability = value[0]
                  setStability(newStability)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      tts: {
                        ...agent.conversation_config.tts,
                        stability: newStability
                      }
                    }
                  })
                }}
                className="w-full"
              />
              <div className="text-right mt-1">
                <span className="text-sm text-muted-foreground">
                  {stability.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Скорость
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Контролирует скорость генерируемой речи. Значения ниже 1.0 замедлят речь, а значения выше 1.0 ускорят ее. Экстремальные значения могут повлиять на качество генерируемой речи.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Контролирует скорость генерируемой речи. Значения ниже 1.0 замедлят речь, а значения выше 1.0 ускорят ее. Экстремальные значения могут повлиять на качество генерируемой речи.
            </p>
            
            <div className="mb-4">
              <Slider
                min={0}
                max={1.2}
                step={0.01}
                value={[speed]}
                onValueChange={(value) => {
                  const newSpeed = value[0]
                  setSpeed(newSpeed)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      tts: {
                        ...agent.conversation_config.tts,
                        speed: newSpeed
                      }
                    }
                  })
                }}
                className="w-full"
              />
              <div className="text-right mt-1">
                <span className="text-sm text-muted-foreground">
                  {speed.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Similarity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Схожесть
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Более высокие значения повысят общую четкость и последовательность голоса. Очень высокие значения могут привести к артефактам. Рекомендуется настроить это значение для поиска правильного баланса.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Более высокие значения повысят общую четкость и последовательность голоса. Очень высокие значения могут привести к артефактам. Рекомендуется настроить это значение для поиска правильного баланса.
            </p>
            
            <div className="mb-4">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[similarity]}
                onValueChange={(value) => {
                  const newSimilarity = value[0]
                  setSimilarity(newSimilarity)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      tts: {
                        ...agent.conversation_config.tts,
                        similarity_boost: newSimilarity
                      }
                    }
                  })
                }}
                className="w-full"
              />
              <div className="text-right mt-1">
                <span className="text-sm text-muted-foreground">
                  {similarity.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 