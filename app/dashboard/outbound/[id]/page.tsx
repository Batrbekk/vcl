"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useBatchCallsStore, type BatchCallDetails } from "@/store/batch-calls-store"
import { Loader } from "@/components/ui/loader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, ArrowLeft, Phone, Users, Clock, Calendar } from "lucide-react"

export default function BatchCallDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { fetchBatchCall, cancelBatchCall } = useBatchCallsStore()
  const [batchCall, setBatchCall] = useState<BatchCallDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const loadBatchCall = async () => {
      setIsLoading(true)
      const data = await fetchBatchCall(id)
      setBatchCall(data)
      setIsLoading(false)
    }

    if (id) {
      loadBatchCall()
    }
  }, [id, fetchBatchCall])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'scheduled':
        return 'bg-purple-100 text-purple-800'
      case 'initiated':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Завершено'
      case 'in_progress':
        return 'В процессе'
      case 'pending':
        return 'Ожидание'
      case 'failed':
        return 'Ошибка'
      case 'scheduled':
        return 'Запланировано'
      case 'initiated':
        return 'Инициировано'
      default:
        return status
    }
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours} часа назад`
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getSuccessRate = (batchCall: BatchCallDetails) => {
    if (batchCall.total_calls_scheduled === 0) return 0
    return Math.round((batchCall.total_calls_dispatched / batchCall.total_calls_scheduled) * 100)
  }

  // Получаем все уникальные ключи из dynamic_variables
  const getDynamicVariableKeys = () => {
    if (!batchCall?.recipients) return []
    const allKeys = new Set<string>()
    batchCall.recipients.forEach(recipient => {
      Object.keys(recipient.conversation_initiation_client_data.dynamic_variables).forEach(key => {
        allKeys.add(key)
      })
    })
    return Array.from(allKeys)
  }

  const dynamicKeys = getDynamicVariableKeys()

  const handleCancelBatchCall = async () => {
    if (!batchCall) return
    
    setIsCancelling(true)
    const success = await cancelBatchCall(batchCall.id)
    
    if (success) {
      // Обновляем данные после отмены
      const updatedData = await fetchBatchCall(batchCall.id)
      setBatchCall(updatedData)
    }
    
    setIsCancelling(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full p-8 relative">
        <Loader />
      </div>
    )
  }

  if (!batchCall) {
    return (
      <div className="min-h-screen w-full p-8 relative">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Групповой звонок не найден</h2>
          <Link href="/dashboard/outbound">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full p-8 relative">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link href="/dashboard/outbound" className="hover:text-gray-700">
          Групповые звонки
        </Link>
        <span className="mx-2">/</span>
        <span>{batchCall.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{batchCall.name}</h1>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">{batchCall.agent_name}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            disabled={batchCall.status.toLowerCase() === 'completed' || isCancelling || batchCall.status.toLowerCase() === 'cancelled'}
            onClick={handleCancelBatchCall}
            className="cursor-pointer"
          >
            <X className="h-4 w-4 mr-2" />
            {isCancelling ? 'Отменяется...' : 'Отмена'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="px-6">
            <div className="text-sm text-gray-500 mb-1">Статус</div>
            <Badge className={getStatusColor(batchCall.status)}>
              ✓ {getStatusText(batchCall.status)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-6">
            <div className="text-sm text-gray-500 mb-1">Всего получателей</div>
            <div className="text-2xl font-bold">{batchCall.total_calls_scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-6">
            <div className="text-sm text-gray-500 mb-1">Запущен</div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDateTime(batchCall.scheduled_time_unix)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-6">
            <div className="text-sm text-gray-500 mb-1">Прогресс</div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              <span className="text-2xl font-bold">{getSuccessRate(batchCall)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Получатели звонков</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Телефон
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Переопределение
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Переопределение
                    </div>
                  </th>
                  {dynamicKeys.map((key) => (
                    <th key={key} className="text-left py-3 px-4 font-medium text-gray-500">
                      <div className="flex items-center">
                        {} Динамическая переменная
                      </div>
                    </th>
                  ))}
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Статус
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-sm text-gray-500">
                  <td className="py-2 px-4">phone_number</td>
                  <td className="py-2 px-4">language</td>
                  <td className="py-2 px-4">first_message</td>
                  {dynamicKeys.map((key) => (
                    <td key={key} className="py-2 px-4">{key}</td>
                  ))}
                  <td className="py-2 px-4">status</td>
                </tr>
                {batchCall.recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{recipient.phone_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="inline-block w-4 h-3 mr-2 rounded-sm bg-red-500"></span>
                        {recipient.conversation_initiation_client_data.conversation_config_override.agent.language}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {recipient.conversation_initiation_client_data.conversation_config_override.agent.first_message || '-'}
                    </td>
                    {dynamicKeys.map((key) => (
                      <td key={key} className="py-3 px-4">
                        {recipient.conversation_initiation_client_data.dynamic_variables[key] || '-'}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(recipient.status)}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {getStatusText(recipient.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 