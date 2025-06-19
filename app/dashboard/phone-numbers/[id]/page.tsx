"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePhoneStore } from "@/store/phone-store"
import { useAgentStore } from "@/store/agent-store"
import { ArrowLeft, Trash2, Copy, Phone, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb"
import { Loader } from "@/components/ui/loader"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { PhoneNumber } from "@/store/phone-store"
import { toast } from "sonner"

export default function PhoneNumberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { fetchPhoneNumberDetails, deletePhoneNumber, assignAgentToPhoneNumber, makeOutboundCallTwilio, makeOutboundCallSipTrunk } = usePhoneStore()
  const { agents, fetchAgents } = useAgentStore()
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [outboundCallDialogOpen, setOutboundCallDialogOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [callAgentId, setCallAgentId] = useState<string>("")
  const [callToNumber, setCallToNumber] = useState<string>("")
  const [isCallInProgress, setIsCallInProgress] = useState(false)
  const phoneNumberId = params.id as string

  useEffect(() => {
    const loadPhoneNumber = async () => {
      if (!phoneNumberId) return
      
      setIsLoading(true)
      try {
        const phoneNumberData = await fetchPhoneNumberDetails(phoneNumberId)
        setPhoneNumber(phoneNumberData)
        if (phoneNumberData?.assigned_agent?.agent_id) {
          setSelectedAgentId(phoneNumberData.assigned_agent.agent_id)
        }
      } finally {
        setIsLoading(false)
      }
    }

    const loadAgents = async () => {
      await fetchAgents()
    }

    loadPhoneNumber()
    loadAgents()
  }, [phoneNumberId, fetchPhoneNumberDetails, fetchAgents])

  const handleDeletePhoneNumber = async () => {
    if (!phoneNumber) return
    
    await deletePhoneNumber(phoneNumber.phone_number_id)
    setDeleteDialogOpen(false)
    router.push('/dashboard/phone-numbers')
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("ID номера скопирован в буфер обмена")
    } catch {
      toast.error("Ошибка при копировании ID")
    }
  }

  const handleAssignAgent = async (agentId: string) => {
    if (!phoneNumber) return
    
    const result = await assignAgentToPhoneNumber(phoneNumber.phone_number_id, agentId)
    if (result.success) {
      setSelectedAgentId(agentId)
      // Обновляем данные номера телефона
      const updatedPhoneNumber = await fetchPhoneNumberDetails(phoneNumber.phone_number_id)
      if (updatedPhoneNumber) {
        setPhoneNumber(updatedPhoneNumber)
      }
    }
  }

  const handleOutboundCall = async () => {
    if (!phoneNumber || !callAgentId || !callToNumber) {
      toast.error("Заполните все поля")
      return
    }

    setIsCallInProgress(true)
    
    const callData = {
      agent_id: callAgentId,
      agent_phone_number_id: phoneNumber.phone_number_id,
      to_number: callToNumber
    }

    try {
      let result
      if (phoneNumber.provider === "twilio") {
        result = await makeOutboundCallTwilio(callData)
      } else {
        result = await makeOutboundCallSipTrunk(callData)
      }

      if (result.success) {
        setOutboundCallDialogOpen(false)
        setCallAgentId("")
        setCallToNumber("")
      } else {
        // Если success: false, показываем сообщение о проблеме на стороне SIP сервера
        toast.error("Проблема на стороне SIP сервера. Попробуйте позже или свяжитесь с поддержкой.")
      }
    } finally {
      setIsCallInProgress(false)
    }
  }

  if (isLoading) {
    return <Loader />
  }

  if (!phoneNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h3 className="text-lg font-medium">Номер телефона не найден</h3>
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
                    <BreadcrumbLink href="/dashboard/phone-numbers">Номера телефонов</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="text-lg">
                    <BreadcrumbPage>
                      {phoneNumber.label}
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
                      onClick={() => handleCopyId(phoneNumber.phone_number_id)}
                      className="h-7 px-2 font-mono text-sm cursor-pointer hover:bg-muted"
                    >
                      {phoneNumber.phone_number_id}
                      <Copy className="h-3 w-3 ml-1" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Копировать ID номера
                  </TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOutboundCallDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Исходящий звонок
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Выполнить тестовый исходящий звонок
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
                  Удалить номер телефона
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Основная информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Номер телефона
                </Label>
                <p className="text-lg font-mono font-semibold">
                  {phoneNumber.phone_number}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Название
                </Label>
                <p className="text-lg">
                  {phoneNumber.label}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Провайдер
                </Label>
                <p className="text-lg capitalize">
                  {phoneNumber.provider === "sip_trunk" ? "SIP Trunk" : phoneNumber.provider}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Агент
                </Label>
                <Select 
                  value={selectedAgentId || undefined} 
                  onValueChange={(value) => {
                    if (value === "no-agent") {
                      setSelectedAgentId("")
                    } else {
                      handleAssignAgent(value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите агента" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-agent">Нет агента</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.agent_id} value={agent.agent_id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Назначьте агента для обработки звонков на этот номер телефона.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SIP Trunk Configuration */}
        {phoneNumber.provider === "sip_trunk" && phoneNumber.provider_config && (
          <Card>
            <CardHeader>
              <CardTitle>Настройка исходящих SIP Trunk</CardTitle>
              <p className="text-sm text-gray-600">
                Настройки конфигурации для этого SIP Trunk номера телефона.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Адрес
                  </Label>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded border">
                    {phoneNumber.provider_config.address || "Не указан"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Протокол транспорта
                  </Label>
                  <p className="text-sm font-semibold uppercase">
                    {phoneNumber.provider_config.transport}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Шифрование медиа
                  </Label>
                  <p className="text-sm">
                    {phoneNumber.provider_config.media_encryption === "allowed" && "Разрешено (Default)"}
                    {phoneNumber.provider_config.media_encryption === "disabled" && "Отключено"}
                    {phoneNumber.provider_config.media_encryption === "required" && "Обязательно"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Аутентификация
                  </Label>
                  <p className="text-sm">
                    {phoneNumber.provider_config.has_auth_credentials 
                      ? "Имя пользователя и пароль настроены" 
                      : "Аутентификация не настроена"
                    }
                  </p>
                </div>
                
                {phoneNumber.provider_config.has_auth_credentials && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Имя пользователя
                    </Label>
                    <p className="font-mono text-sm">
                      {phoneNumber.provider_config.username}
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Headers */}
              {phoneNumber.provider_config.headers && Object.keys(phoneNumber.provider_config.headers).length > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-900">
                    Пользовательские заголовки
                  </Label>
                  <div className="space-y-2">
                    {Object.entries(phoneNumber.provider_config.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-4 text-sm">
                        <span className="font-mono font-semibold min-w-32">
                          {key}:
                        </span>
                        <span className="font-mono bg-gray-50 px-2 py-1 rounded border flex-1">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить номер телефона</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить номер телефона &quot;{phoneNumber.label}&quot;? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePhoneNumber}
              className="bg-red-500 text-white hover:bg-destructive/80 cursor-pointer"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Outbound Call Dialog */}
      <AlertDialog open={outboundCallDialogOpen} onOpenChange={setOutboundCallDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Исходящий звонок
            </AlertDialogTitle>
            <AlertDialogDescription>
              Введите номер телефона для получения звонка от одного из ваших агентов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="call-agent">Выберите агента</Label>
              <Select 
                value={callAgentId} 
                onValueChange={setCallAgentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.agent_id} value={agent.agent_id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone-number">Номер телефона</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="Введите номер телефона"
                value={callToNumber}
                onChange={(e) => setCallToNumber(e.target.value)}
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Закрыть</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleOutboundCall}
              disabled={!callAgentId || !callToNumber || isCallInProgress}
              className="cursor-pointer flex items-center gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              {isCallInProgress ? "Инициируется..." : "Отправить тестовый звонок"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 