"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onForgotPassword?: () => void;
}

export function LoginForm({ className, onForgotPassword, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
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
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Пароль
            </Label>
            <Input
              id="password"
              placeholder="Пароль"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect="off"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-end w-full mb-1">
            <button 
              type="button" 
              onClick={onForgotPassword}
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Забыли пароль?
            </button>
          </div>
          <Button 
            disabled={isLoading} 
            className="bg-[#09090F] hover:bg-[#09090F]/90"
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Войти
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Или продолжить с помощью
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        type="button" 
        disabled={isLoading}
        className="border-[#09090F] text-[#09090F] hover:bg-[#09090F]/10"
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{" "}
        Google
      </Button>
    </div>
  )
} 