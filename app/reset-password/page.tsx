"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useResetStore } from "@/store/reset-store"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { AuthDecorator } from "@/components/auth/auth-decorator"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { setEmail } = useResetStore()

  React.useEffect(() => {
    if (email) {
      setEmail(email)
    } else {
      window.location.href = '/'
    }
  }, [email, setEmail])

  if (!email) {
    return null
  }

  return (
    <div className="container relative min-h-screen flex flex-col items-center justify-center px-4 md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AuthDecorator />
      <div className="flex items-center justify-center w-full py-12 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Сброс пароля
            </h1>
            <p className="text-sm text-muted-foreground">
              Введите новый пароль для вашего аккаунта
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
} 