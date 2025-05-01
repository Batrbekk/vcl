"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRegisterStore } from "@/store/register-store"
import { registerFirstStepSchema, RegisterFirstStepData } from "@/lib/validations/auth"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Icons } from "@/components/icons"

export function PersonalDataForm() {
  const { firstStepData, setFirstStepData, nextStep, isLoading, setLoading } = useRegisterStore()

  const form = useForm<RegisterFirstStepData>({
    resolver: zodResolver(registerFirstStepSchema),
    defaultValues: {
      email: firstStepData?.email || "",
      firstName: firstStepData?.firstName || "",
      lastName: firstStepData?.lastName || "",
      companyName: firstStepData?.companyName || "",
    },
    mode: "onChange"
  })

  const onSubmit = async (data: RegisterFirstStepData) => {
    try {
      setLoading(true)
      setFirstStepData(data)
      nextStep()
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error)
      toast.error('Произошла ошибка при сохранении данных')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Email" 
                  {...field} 
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Имя" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Фамилия" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Название компании" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#09090F] hover:bg-[#09090F]/90 w-full cursor-pointer"
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Далее
          </Button>
        </div>
      </form>
    </Form>
  )
} 