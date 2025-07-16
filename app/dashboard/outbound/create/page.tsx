"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePhoneStore } from "@/store/phone-store"
import { useAgentStore } from "@/store/agent-store"
import { useBatchCallsStore, type BatchCallRecipient, type CreateBatchCallRequestData } from "@/store/batch-calls-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Download, Phone, Users, Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface Recipient {
  name: string
  phone_number: string
  language: string
  [key: string]: string // для дополнительных динамических полей
}

export default function CreateBatchCallPage() {
  const router = useRouter()
  const { phoneNumbers, fetchPhoneNumbers } = usePhoneStore()
  const { agents, fetchAgents } = useAgentStore()
  const { createBatchCallNew } = useBatchCallsStore()
  
  const [formData, setFormData] = useState({
    name: "Untitled Batch",
    phone_number_id: "",
    agent_id: "",
    timing: "immediate" as "immediate" | "scheduled",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "12:00"
  })
  
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [dynamicVariableKeys, setDynamicVariableKeys] = useState<string[]>([])

  useEffect(() => {
    fetchPhoneNumbers()
    fetchAgents()
  }, [fetchPhoneNumbers, fetchAgents])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    // Проверяем размер файла (25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимальный размер 25MB")
      return
    }

    // Проверяем тип файла
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('excel') || file.type.includes('spreadsheet')
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv'
    
    if (!isExcel && !isCsv) {
      toast.error("Поддерживаются только CSV и XLS файлы")
      return
    }

    setIsUploading(true)
    
    try {
      let headers: string[] = []
      let dataRows: string[][] = []
      
      if (isExcel) {
        // Обрабатываем Excel файл
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Конвертируем в массив массивов
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
        
        if (jsonData.length === 0) {
          toast.error("Файл пустой")
          return
        }
        
        headers = jsonData[0].map(h => String(h || '').trim())
        dataRows = jsonData.slice(1).filter(row => row.some(cell => cell != null && String(cell).trim() !== ''))
        
      } else {
        // Обрабатываем CSV файл
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          toast.error("Файл пустой")
          return
        }
        
        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        dataRows = lines.slice(1).map(line => 
          line.split(',').map(v => v.trim().replace(/"/g, ''))
        ).filter(row => row.some(cell => cell.trim() !== ''))
      }
      
      // Проверяем наличие обязательной колонки phone_number
      if (!headers.includes('phone_number')) {
        toast.error("Обязательная колонка 'phone_number' не найдена в файле")
        return
      }
      
      // Определяем динамические переменные (все колонки кроме стандартных)
      const standardColumns = ['phone_number', 'language', 'first_message', 'name']
      const dynamicKeys = headers.filter(header => !standardColumns.includes(header))
      
      // Парсим данные
      const parsedRecipients: Recipient[] = []
      
      for (const row of dataRows) {
        if (row.length >= headers.length) {
          const recipient: Recipient = {
            name: "",
            phone_number: "",
            language: "ru"
          }
          
          headers.forEach((header, index) => {
            if (row[index] != null && String(row[index]).trim()) {
              recipient[header] = String(row[index]).trim()
            }
          })
          
          // Проверяем обязательное поле phone_number
          if (recipient.phone_number) {
            parsedRecipients.push(recipient)
          }
        }
      }

      if (parsedRecipients.length === 0) {
        toast.error("Не найдено валидных записей с номерами телефонов")
        return
      }

      setDynamicVariableKeys(dynamicKeys)
      setRecipients(parsedRecipients)
      toast.success(`Загружено ${parsedRecipients.length} получателей`)
      
    } catch (error) {
      console.error('Ошибка при парсинге файла:', error)
      toast.error("Ошибка при парсинге файла")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const downloadTemplate = () => {
    const csvContent = "name,phone_number,language\nNev,+38383810429,en\nAnton,+38383810429,pl\nThor,+38383810429,de"
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch_call_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Укажите название группового звонка")
      return
    }

    if (!formData.phone_number_id) {
      toast.error("Выберите номер телефона")
      return
    }

    if (!formData.agent_id) {
      toast.error("Выберите агента")
      return
    }

    if (recipients.length === 0) {
      toast.error("Добавьте получателей")
      return
    }

    // Проверяем поля для запланированного времени
    if (formData.timing === "scheduled") {
      if (!formData.scheduledDate) {
        toast.error("Выберите дату для запланированного звонка")
        return
      }
      
      if (!formData.scheduledTime) {
        toast.error("Выберите время для запланированного звонка")
        return
      }
    }

    setIsCreating(true)

    try {
      let scheduled_time_unix: number
      
      if (formData.timing === "scheduled" && formData.scheduledDate && formData.scheduledTime) {
        // Создаем объект Date с выбранной датой и временем
        const [hours, minutes] = formData.scheduledTime.split(':').map(Number)
        const scheduledDateTime = new Date(formData.scheduledDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        
        // Проверяем, что выбранное время в будущем
        if (scheduledDateTime <= new Date()) {
          toast.error("Выберите время в будущем")
          setIsCreating(false)
          return
        }
        
        scheduled_time_unix = Math.floor(scheduledDateTime.getTime() / 1000)
      } else {
        // Для "отправить немедленно" - текущее время + 1 минута
        scheduled_time_unix = Math.floor(Date.now() / 1000) + 60
      }

      // Создаем получателей для нового API
      const apiRecipients: BatchCallRecipient[] = recipients.map(recipient => {
        const batchRecipient: BatchCallRecipient = {
          phone_number: recipient.phone_number
        }

        // Добавляем персонализированные данные если есть
        if (recipient.language || recipient.first_message || Object.keys(recipient).some(key => !['name', 'phone_number', 'language', 'first_message'].includes(key))) {
          batchRecipient.conversation_initiation_client_data = {
            conversation_config_override: {
              agent: {
                language: recipient.language || 'ru',
                ...(recipient.first_message && { first_message: recipient.first_message }),
                prompt: null
              },
              tts: {
                voice_id: null
              },
              conversation: null
            },
            custom_llm_extra_body: {},
            dynamic_variables: {}
          }

          // Добавляем динамические переменные
          Object.keys(recipient).forEach(key => {
            if (!['phone_number', 'language', 'first_message'].includes(key)) {
              if (batchRecipient.conversation_initiation_client_data?.dynamic_variables) {
                batchRecipient.conversation_initiation_client_data.dynamic_variables[key] = recipient[key]
              }
            }
          })
        }

        return batchRecipient
      })

      const batchCallData: CreateBatchCallRequestData = {
        call_name: formData.name,
        agent_id: formData.agent_id,
        agent_phone_number_id: formData.phone_number_id,
        recipients: apiRecipients,
        scheduled_time_unix
      }

      const result = await createBatchCallNew(batchCallData)
      
      if (result) {
        toast.success("Групповой звонок успешно создан")
        router.push("/dashboard/outbound")
      }
      
    } catch {
      toast.error("Ошибка при создании группового звонка")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen w-full p-8 relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/outbound">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Создать групповой звонок</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Batch name */}
          <div className="space-y-2">
            <Label htmlFor="batch-name">Название группового звонка</Label>
            <Input
              id="batch-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Untitled Batch"
            />
          </div>

          {/* Phone Number and Agent */}
          <div className="flex gap-4">
            {/* Phone Number */}
            <div className="space-y-2 w-1/2">
              <Label>Номер телефона</Label>
              <Select value={formData.phone_number_id} onValueChange={(value) => setFormData({ ...formData, phone_number_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите номер телефона" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => (
                    <SelectItem key={phone.phone_number_id} value={phone.phone_number_id}>
                      {phone.phone_number} ({phone.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Agent */}
            <div className="space-y-2 w-1/2">
              <Label>Выберите агента</Label>
              <Select value={formData.agent_id} onValueChange={(value) => setFormData({ ...formData, agent_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Получатели</Label>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>25.0 MB</span>
                <span className="py-1 px-2 border rounded-lg text-black">CSV</span>
                <span className="py-1 px-2 border rounded-lg text-black">XLS</span>
              </div>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              </label>
            </div>

            {/* Formatting */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Форматирование</CardTitle>
                <p className="text-sm text-gray-600">
                  Колонка <strong>phone_number</strong> обязательна. Вы также можете передать определенные <strong>переопределения</strong>. Остальные колонки будут переданы как динамические переменные.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-blue-600">name</th>
                          <th className="text-left py-2 px-3 text-blue-600">phone_number</th>
                          <th className="text-left py-2 px-3 text-blue-600">language</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-3">Nev</td>
                          <td className="py-2 px-3">+38383810429</td>
                          <td className="py-2 px-3">en</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3">Anton</td>
                          <td className="py-2 px-3">+38383810429</td>
                          <td className="py-2 px-3">pl</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Thor</td>
                          <td className="py-2 px-3">+38383810429</td>
                          <td className="py-2 px-3">de</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Шаблон
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timing */}
            <div className="space-y-3">
              <Label>Время отправки</Label>
              <div className="flex gap-2">
                <Button
                  variant={formData.timing === "immediate" ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, timing: "immediate" })}
                  className="flex-1"
                >
                  Отправить немедленно
                </Button>
                <Button
                  variant={formData.timing === "scheduled" ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, timing: "scheduled" })}
                  className="flex-1"
                >
                  Запланировать на потом
                </Button>
              </div>

              {/* Scheduled date and time fields */}
              {formData.timing === "scheduled" && (
                <div className="space-y-3 pt-2">
                  {/* Date picker */}
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.scheduledDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.scheduledDate ? (
                            format(formData.scheduledDate, "PPP", { locale: ru })
                          ) : (
                            "Выберите дату"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.scheduledDate}
                          onSelect={(date) => setFormData({ ...formData, scheduledDate: date })}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time picker */}
                  <div className="space-y-2">
                    <Label>Время</Label>
                    <Input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:pl-8">
          <Card>
            <CardContent className="p-8">
              {recipients.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Получатели звонков ({recipients.length})</h3>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
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
                          {dynamicVariableKeys.map((key) => (
                            <th key={key} className="text-left py-3 px-4 font-medium text-gray-500">
                              <div className="flex items-center">
                                {} Динамическая переменная
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-sm text-gray-500">
                          <td className="py-2 px-4">phone_number</td>
                          <td className="py-2 px-4">language</td>
                          <td className="py-2 px-4">first_message</td>
                          {dynamicVariableKeys.map((key) => (
                            <td key={key} className="py-2 px-4">{key}</td>
                          ))}
                        </tr>
                        {recipients.slice(0, 10).map((recipient, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{recipient.phone_number}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className="inline-block w-4 h-3 mr-2 rounded-sm bg-red-500"></span>
                                {recipient.language || 'ru'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {recipient.first_message || '-'}
                            </td>
                            {dynamicVariableKeys.map((key) => (
                              <td key={key} className="py-3 px-4">
                                {recipient[key] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {recipients.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">И еще {recipients.length - 10} получателей...</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📞</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Пока нет получателей</h3>
                  <p className="text-gray-500">
                    Загрузите CSV файл для добавления получателей в этот групповой звонок
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          {recipients.length > 0 && (
            <div className="mt-6">
              <Button 
                onClick={handleSubmit}
                disabled={isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? 'Создается...' : 'Создать групповой звонок'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 