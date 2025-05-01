"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useResetStore } from "@/store/reset-store"
import { resetPasswordEmailSchema, type ResetPasswordEmailData } from "@/lib/validations/auth"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"

interface ForgotPasswordFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onBackToLogin?: () => void;
}

export function ForgotPasswordForm({ className, onBackToLogin, ...props }: ForgotPasswordFormProps) {
  const router = useRouter()
  const { setEmail, isLoading } = useResetStore()

  const form = useForm<ResetPasswordEmailData>({
    resolver: zodResolver(resetPasswordEmailSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange"
  })

  async function onSubmit(data: ResetPasswordEmailData) {
    try {
      setEmail(data.email)
      router.push(`/verify?email=${encodeURIComponent(data.email)}&mode=reset`)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Восстановление пароля
        </h1>
        <p className="text-sm text-muted-foreground">
          Введите email, на который будет отправлен код подтверждения
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="E-mail"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            disabled={isLoading} 
            className="bg-[#09090F] hover:bg-[#09090F]/90 w-full"
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Отправить код
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-center">
        <button 
          type="button" 
          onClick={onBackToLogin}
          className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Назад к форме входа
        </button>
      </div>
    </div>
  )
} 