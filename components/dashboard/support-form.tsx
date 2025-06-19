'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
import { useUserStore } from '@/store/user-store'
import { useSupportStore, SupportTicket } from '@/store/support-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const supportSchema = z.object({
  clientName: z.string().min(1, 'Введите ваше имя'),
  clientEmail: z.string().email('Введите корректный email'),
  problemType: z.string().min(1, 'Выберите тип проблемы'),
  subject: z.string().min(1, 'Введите тему обращения'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов'),
})

const problemTypes = [
  { value: 'Техническая проблема', label: 'Техническая проблема' },
  { value: 'Вопросы по оплате', label: 'Вопросы по оплате' },
  { value: 'Общий вопрос', label: 'Общий вопрос' },
  { value: 'Другое', label: 'Другое' },
]

export function SupportForm() {
  const { user } = useUserStore()
  const { submitTicket, isLoading } = useSupportStore()

  const form = useForm<SupportTicket>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      clientName: user ? `${user.firstName} ${user.lastName}` : '',
      clientEmail: user?.email || '',
      problemType: '',
      subject: '',
      description: '',
    },
  })

  // Автоматически заполняем поля когда данные пользователя загружаются
  useEffect(() => {
    if (user) {
      form.setValue('clientName', `${user.firstName} ${user.lastName}`)
      form.setValue('clientEmail', user.email)
    }
  }, [user, form])

  const onSubmit = async (data: SupportTicket) => {
    await submitTicket(data)
    if (!isLoading) {
      form.reset({
        ...form.getValues(),
        subject: '',
        description: '',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="problemType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип проблемы</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите причину" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {problemTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тема</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={isLoading}
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Отправка...' : 'Отправить обращение'}
        </Button>
      </form>
    </Form>
  )
} 