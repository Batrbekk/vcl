"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useBatchCallsStore } from "@/store/batch-calls-store"
import { Loader } from "@/components/ui/loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Phone, Users, Clock } from "lucide-react"

export default function OutboundPage() {
  const router = useRouter()
  const { batchCalls, isLoading, fetchBatchCalls } = useBatchCallsStore()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchBatchCalls()
  }, [fetchBatchCalls])

  const handleBatchCallClick = (id: string) => {
    router.push(`/dashboard/outbound/${id}`)
  }

  const filteredBatchCalls = batchCalls.filter(batchCall =>
    batchCall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batchCall.agent_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      default:
        return status
    }
  }

  const getSuccessRate = (batchCall: { total_calls_scheduled: number; total_calls_dispatched: number }) => {
    if (batchCall.total_calls_scheduled === 0) return 0
    return Math.round((batchCall.total_calls_dispatched / batchCall.total_calls_scheduled) * 100)
  }

  const formatTimeDisplay = (batchCall: { status: string; scheduled_time_unix: number; last_updated_at_unix: number }) => {
    const status = batchCall.status.toLowerCase()
    const currentTime = Math.floor(Date.now() / 1000)
    
    switch (status) {
      case 'cancelled':
        // Для отмененных звонков время не отображаем
        return ''
        
      case 'scheduled':
        // Для запланированных звонков показываем время до запуска
        const timeUntilStart = batchCall.scheduled_time_unix - currentTime
        if (timeUntilStart > 0) {
          const hours = Math.floor(timeUntilStart / 3600)
          const minutes = Math.floor((timeUntilStart % 3600) / 60)
          if (hours > 0) {
            return `через ${hours}ч ${minutes}м`
          }
          return `через ${minutes}м`
        }
        return 'Скоро'
        
      case 'in_progress':
      case 'initiated':
        // Для активных звонков показываем время с момента запуска
        const runningTime = currentTime - batchCall.scheduled_time_unix
        if (runningTime > 0) {
          const minutes = Math.floor(runningTime / 60)
          const seconds = runningTime % 60
          return `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
        return '0:00'
        
      case 'completed':
      case 'failed':
        // Для завершенных звонков показываем продолжительность
        const duration = batchCall.last_updated_at_unix - batchCall.scheduled_time_unix
        if (duration > 0) {
          const minutes = Math.floor(duration / 60)
          const seconds = duration % 60
          return `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
        return '0:00'
        
      default:
        return '-'
    }
  }

  return (
    <div className="min-h-screen w-full p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Групповые звонки</h1>
        <Button 
          className="cursor-pointer"
          onClick={() => router.push('/dashboard/outbound/create')}
        >
          Создать групповой звонок
        </Button>
      </div>
      
      {isLoading ? (
        <Loader />
      ) : (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск групповых звонков..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Batch Calls Grid */}
          {filteredBatchCalls.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBatchCalls.map((batchCall) => (
                <Card 
                  key={batchCall.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleBatchCallClick(batchCall.id)}
                >
                  <CardContent className="px-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {batchCall.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          получателей: {batchCall.total_calls_scheduled} 
                        </div>
                        <p className="text-sm text-gray-600">
                          {batchCall.agent_name}
                        </p>
                      </div>
                    </div>

                    {/* Status and Metrics */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(batchCall.status)}>
                          ✓ {getStatusText(batchCall.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{getSuccessRate(batchCall)}%</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            {formatTimeDisplay(batchCall)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredBatchCalls.length === 0 && (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Нет групповых звонков'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Создайте свой первый групповой звонок для начала работы'
                }
              </p>
                        {!searchQuery && (
            <Button onClick={() => router.push('/dashboard/outbound/create')}>
              Создать групповой звонок
            </Button>
          )}
            </div>
          )}
        </>
      )}
    </div>
  )
} 