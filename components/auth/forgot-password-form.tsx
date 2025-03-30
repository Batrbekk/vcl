"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ForgotPasswordFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onBackToLogin?: () => void;
}

export function ForgotPasswordForm({ className, onBackToLogin, ...props }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [emailSent, setEmailSent] = React.useState<boolean>(false)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    // Simulate API request
    setTimeout(() => {
      setIsLoading(false)
      setEmailSent(true)
    }, 2000)
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Восстановление пароля
        </h1>
        <p className="text-sm text-muted-foreground">
          {emailSent 
            ? "Инструкции по восстановлению отправлены на ваш email" 
            : "Введите email, связанный с вашим аккаунтом"
          }
        </p>
      </div>

      {!emailSent ? (
        <form onSubmit={onSubmit}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Электронная почта
              </Label>
              <Input
                id="email"
                placeholder="E-mail"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
              />
            </div>
            <Button 
              disabled={isLoading} 
              className="bg-[#09090F] hover:bg-[#09090F]/90 mt-2"
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Отправить инструкции
            </Button>
          </div>
        </form>
      ) : (
        <Button 
          onClick={onBackToLogin}
          className="bg-[#09090F] hover:bg-[#09090F]/90"
        >
          Вернуться к форме входа
        </Button>
      )}

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