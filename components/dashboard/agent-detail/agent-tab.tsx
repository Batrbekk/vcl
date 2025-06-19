import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { useAgentStore, type AgentDetails, type LLMPrice, type KnowledgeBaseDocument } from "@/store/agent-store"
import { Search, Trash2, Globe, FileText, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

interface AgentTabProps {
  agent: AgentDetails
  onUpdate?: (updatedData: Partial<AgentDetails>) => void
}

const LANGUAGES = [
  { value: 'ru', label: 'Русский', disabled: false },
  { value: 'kk', label: 'Казахский', disabled: true, note: 'скоро будет добавлен' }
]

const TEMPERATURE_PRESETS = [
  { 
    value: 0, 
    label: 'Детерминистический', 
    tooltip: 'Наиболее предсказуемые и консистентные ответы. Минимум творчества и случайности.' 
  },
  { 
    value: 0.5, 
    label: 'Креативный', 
    tooltip: 'Сбалансированный режим между предсказуемостью и творчеством. Рекомендуется для большинства задач.' 
  },
  { 
    value: 1.0, 
    label: 'Более креативный', 
    tooltip: 'Максимум творчества и разнообразия в ответах. Может быть менее предсказуемым.' 
  }
]

export function AgentTab({ agent, onUpdate }: AgentTabProps) {
  const router = useRouter()
  const { fetchLLMPrices, fetchKnowledgeBase } = useAgentStore()
  const [agentName, setAgentName] = useState(agent.name)
  const [language, setLanguage] = useState(agent.conversation_config.agent.language)
  const [firstMessage, setFirstMessage] = useState(agent.conversation_config.agent.first_message)
  const [systemPrompt, setSystemPrompt] = useState(agent.conversation_config.agent.prompt.prompt)
  const [selectedLLM, setSelectedLLM] = useState(agent.conversation_config.agent.prompt.llm)
  const [temperature, setTemperature] = useState(agent.conversation_config.agent.prompt.temperature || 0.5)
  const [llmOptions, setLLMOptions] = useState<LLMPrice[]>([])
  const [isLoadingLLM, setIsLoadingLLM] = useState(false)
  
  // Knowledge Base states
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(() => {
    const knowledgeBase = agent.conversation_config.agent.prompt.knowledge_base || []
    // Если это массив объектов с id, извлекаем ID
    if (knowledgeBase.length > 0 && typeof knowledgeBase[0] === 'object' && knowledgeBase[0] !== null) {
      const firstItem = knowledgeBase[0] as unknown
      if (typeof firstItem === 'object' && firstItem !== null && 'id' in firstItem) {
        return (knowledgeBase as unknown as Array<{ id: string }>).map(item => item.id)
      }
    }
    // Если это массив строк, возвращаем как есть
    return knowledgeBase as string[]
  })
  const [useRAG, setUseRAG] = useState(agent.conversation_config.agent.prompt.rag.enabled || false)
  const [availableDocuments, setAvailableDocuments] = useState<KnowledgeBaseDocument[]>([])
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const loadLLMOptions = async () => {
      setIsLoadingLLM(true)
      const llmPrices = await fetchLLMPrices(agent.agent_id)
      setLLMOptions(llmPrices)
      setIsLoadingLLM(false)
    }
    loadLLMOptions()
  }, [agent.agent_id, fetchLLMPrices])

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      setIsLoadingKnowledge(true)
      const documents = await fetchKnowledgeBase()
      setAvailableDocuments(documents)
      setIsLoadingKnowledge(false)
    }
    loadKnowledgeBase()
  }, [fetchKnowledgeBase])

  const filteredDocuments = availableDocuments
    .filter(doc => !selectedDocuments.includes(doc.id))
    .filter(doc => 
      searchQuery === "" || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const getSelectedDocumentsByIds = (ids: string[]) => {
    return availableDocuments.filter(doc => ids.includes(doc.id))
  }

  const handleAddDocument = (documentId: string) => {
    const newDocuments = [...selectedDocuments, documentId]
    setSelectedDocuments(newDocuments)
    setIsDialogOpen(false)
    setSearchQuery("")
    onUpdate?.({
      conversation_config: {
        ...agent.conversation_config,
        agent: {
          ...agent.conversation_config.agent,
          prompt: {
            ...agent.conversation_config.agent.prompt,
            knowledge_base: newDocuments.map(docId => {
              const doc = availableDocuments.find(d => d.id === docId)
              return doc ? { 
                id: doc.id, 
                name: doc.name, 
                type: doc.type, 
                usage_mode: "auto" 
              } : { 
                id: docId, 
                usage_mode: "auto" 
              }
            })
          }
        }
      }
    })
  }

  const handleRemoveDocument = (documentId: string) => {
    const newDocuments = selectedDocuments.filter(id => id !== documentId)
    setSelectedDocuments(newDocuments)
    onUpdate?.({
      conversation_config: {
        ...agent.conversation_config,
        agent: {
          ...agent.conversation_config.agent,
          prompt: {
            ...agent.conversation_config.agent.prompt,
            knowledge_base: newDocuments.map(docId => {
              const doc = availableDocuments.find(d => d.id === docId)
              return doc ? { 
                id: doc.id, 
                name: doc.name, 
                type: doc.type, 
                usage_mode: "auto" 
              } : { 
                id: docId, 
                usage_mode: "auto" 
              }
            })
          }
        }
      }
    })
  }

  const handleGoToKnowledge = () => {
    router.push('/dashboard/knowledge')
  }

  return (
    <div className="space-y-6">
      {/* Имя агента */}
      <Card>
        <CardHeader>
          <CardTitle>Имя агента</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Укажите название для вашего агента
            </p>
            <Input
              value={agentName}
              onChange={(e) => {
                const newName = e.target.value
                setAgentName(newName)
                onUpdate?.({ name: newName })
              }}
              placeholder="Введите имя агента"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Выбор языка */}
      <Card>
        <CardHeader>
          <CardTitle>Язык агента</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Выберите язык, на котором будет общаться агент
            </p>
            <Select value={language} onValueChange={(value) => {
              setLanguage(value)
              onUpdate?.({
                conversation_config: {
                  ...agent.conversation_config,
                  agent: {
                    ...agent.conversation_config.agent,
                    language: value
                  }
                }
              })
            }}>
              <SelectTrigger className="w-fit min-w-48">
                <SelectValue placeholder="Выберите язык" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} disabled={lang.disabled}>
                    <div className="flex items-center justify-between w-full">
                      <span>{lang.label}</span>
                      {lang.note && (
                        <span className="text-xs text-muted-foreground ml-4">
                          {lang.note}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Первое сообщение */}
      <Card>
        <CardHeader>
          <CardTitle>Первое сообщение</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Сообщение, которое агент произнесет первым при начале разговора
            </p>
            <Input
              value={firstMessage}
              onChange={(e) => {
                const newFirstMessage = e.target.value
                setFirstMessage(newFirstMessage)
                onUpdate?.({
                  conversation_config: {
                    ...agent.conversation_config,
                    agent: {
                      ...agent.conversation_config.agent,
                      first_message: newFirstMessage
                    }
                  }
                })
              }}
              placeholder="Введите первое сообщение агента"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Системный промпт */}
      <Card>
        <CardHeader>
          <CardTitle>Системный промпт</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Инструкции для агента, описывающие его поведение и роль
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => {
                const newPrompt = e.target.value
                setSystemPrompt(newPrompt)
                onUpdate?.({
                  conversation_config: {
                    ...agent.conversation_config,
                    agent: {
                      ...agent.conversation_config.agent,
                      prompt: {
                        ...agent.conversation_config.agent.prompt,
                        prompt: newPrompt
                      }
                    }
                  }
                })
              }}
              placeholder="Введите системный промпт для агента"
              className="w-fit min-w-96 min-h-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Поведение (Температура) */}
      <Card>
        <CardHeader>
          <CardTitle>Поведение</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Этот параметр контролирует творческий подход и случайность ответов модели
            </p>
            
            {/* Ползунок */}
            <div className="mb-4">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[temperature]}
                onValueChange={(value) => {
                  const newTemperature = value[0]
                  setTemperature(newTemperature)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      agent: {
                        ...agent.conversation_config.agent,
                        prompt: {
                          ...agent.conversation_config.agent.prompt,
                          temperature: newTemperature
                        }
                      }
                    }
                  })
                }}
                className="w-full"
              />
              <div className="text-right mt-1">
                <span className="text-sm text-muted-foreground">
                  {temperature.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Быстрые настройки */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Быстрые настройки:</p>
              <div className="flex gap-2">
                {TEMPERATURE_PRESETS.map((preset) => (
                  <Tooltip key={preset.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setTemperature(preset.value)
                          onUpdate?.({
                            conversation_config: {
                              ...agent.conversation_config,
                              agent: {
                                ...agent.conversation_config.agent,
                                prompt: {
                                  ...agent.conversation_config.agent.prompt,
                                  temperature: preset.value
                                }
                              }
                            }
                          })
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          temperature === preset.value
                            ? 'bg-black text-white border-black cursor-pointer'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        {preset.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{preset.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* База знаний */}
      <Card>
        <CardHeader>
          <CardTitle>База знаний</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Предоставьте LLM доменную информацию, чтобы помочь ей более точно отвечать на вопросы.
            </p>

            {/* Выбранные документы */}
            <div className="space-y-2">
              {getSelectedDocumentsByIds(selectedDocuments).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    {doc.type === 'url' ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium line-clamp-1">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">{doc.id}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Кнопка добавления документа */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full cursor-pointer">
                  Добавить знания
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Выберите знания</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Поиск */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск знаний..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  {/* Список документов */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {isLoadingKnowledge ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Загрузка...
                      </div>
                    ) : filteredDocuments.length === 0 ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="text-muted-foreground">
                          Нет доступных знаний
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleGoToKnowledge}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Перейти в базу знаний
                        </Button>
                      </div>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleAddDocument(doc.id)}
                          className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          {doc.type === 'url' ? (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm line-clamp-2">{doc.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{doc.id}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Переключатель RAG */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <div className="font-medium text-sm">Использовать RAG</div>
                <div className="text-xs text-muted-foreground">
                  Retrieval-Augmented Generation (RAG) увеличивает максимальный размер базы знаний агента.
                  Агент будет иметь доступ к соответствующим частям прикрепленной базы знаний во время генерации ответа.
                </div>
              </div>
              <Switch
                checked={useRAG}
                onCheckedChange={(value) => {
                  setUseRAG(value)
                  onUpdate?.({
                    conversation_config: {
                      ...agent.conversation_config,
                      agent: {
                        ...agent.conversation_config.agent,
                        prompt: {
                          ...agent.conversation_config.agent.prompt,
                          rag: {
                            ...agent.conversation_config.agent.prompt.rag,
                            enabled: value
                          }
                        }
                      }
                    }
                  })
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Выбор LLM */}
      <Card>
        <CardHeader>
          <CardTitle>Языковая модель (LLM)</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Выберите языковую модель для обработки запросов
            </p>
            <Select value={selectedLLM} onValueChange={(value) => {
              setSelectedLLM(value)
              onUpdate?.({
                conversation_config: {
                  ...agent.conversation_config,
                  agent: {
                    ...agent.conversation_config.agent,
                    prompt: {
                      ...agent.conversation_config.agent.prompt,
                      llm: value
                    }
                  }
                }
              })
            }} disabled={isLoadingLLM}>
              <SelectTrigger className="w-fit min-w-64">
                <SelectValue placeholder={isLoadingLLM ? "Загрузка..." : "Выберите LLM модель"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {llmOptions.map((llm) => (
                  <SelectItem key={llm.llm} value={llm.llm}>
                    <div className="flex justify-between items-center w-full">
                      <span>{llm.llm}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ${llm.price_per_minute.toFixed(4)}/мин
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 