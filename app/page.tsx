"use client"

import { useState } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "@/components/auth/user-auth-form"
import { LoginForm } from "@/components/auth/login-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthDecorator } from "@/components/auth/auth-decorator"

type AuthMode = "register" | "login" | "forgotPassword"

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login")

  const toggleAuthMode = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  return (
    <>
      <div className="container relative min-h-screen flex flex-col items-center justify-center px-4 md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <button
          onClick={() => toggleAuthMode(authMode === "register" ? "login" : "register")}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute right-4 top-4 md:right-8 md:top-8"
          )}
        >
          {authMode === "register" ? "Авторизация" : "Регистрация"}
        </button>
        <AuthDecorator />
        <div className="flex items-center justify-center w-full py-12 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            {authMode !== "forgotPassword" && (
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {authMode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {authMode === "login"
                    ? "Введите ваши данные для входа" 
                    : "Введите ваш email ниже, чтобы создать аккаунт"
                  }
                </p>
              </div>
            )}
            
            {authMode === "register" && <UserAuthForm />}
            {authMode === "login" && (
              <LoginForm onForgotPassword={() => toggleAuthMode("forgotPassword")} />
            )}
            {authMode === "forgotPassword" && (
              <ForgotPasswordForm onBackToLogin={() => toggleAuthMode("login")} />
            )}
            
            {authMode !== "forgotPassword" && (
              <p className="px-8 text-center text-sm text-muted-foreground">
                {authMode === "login" ? (
                  <>
                    Нет аккаунта?{" "}
                    <button 
                      onClick={() => toggleAuthMode("register")}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Зарегистрироваться
                    </button>
                  </>
                ) : (
                  <>
                    Нажимая «Продолжить», вы соглашаетесь с нашими{" "}
                    <Link
                      href="https://vcl.framer.website/terms-conditions"
                      className="underline underline-offset-4 hover:text-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Условиями использования
                    </Link>{" "}
                    и{" "}
                    <Link
                      href="https://vcl.framer.website/privacy-policy"
                      className="underline underline-offset-4 hover:text-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Политикой конфиденциальности
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
