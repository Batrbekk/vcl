"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "@/components/auth/user-auth-form"
import { LoginForm } from "@/components/auth/login-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

type AuthMode = "register" | "login" | "forgotPassword"

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("register")

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
          {authMode === "register" ? "Войти" : "Регистрация"}
        </button>
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
          <div className="absolute inset-0 bg-[#09090F]" />
          
          {/* Decorative blobs */}
          <div className="absolute top-0 left-0 w-full h-full">
            <Image
              src="/blob/1.svg"
              alt=""
              width={600}
              height={600}
              className="absolute -top-20 -left-40 opacity-20 w-[600px] h-[600px]"
            />
            <Image
              src="/blob/2.svg"
              alt=""
              width={600}
              height={600}
              className="absolute -bottom-40 -right-20 opacity-20 w-[500px] h-[500px]"
            />
            <Image
              src="/blob/3.svg"
              alt=""
              width={300}
              height={300}
              className="absolute top-0 right-0 w-[250px] h-[250px] animate-pulse"
              style={{ animationDuration: '10s' }}
            />
            <Image
              src="/blob/4.svg"
              alt=""
              width={250}
              height={250}
              className="absolute bottom-10 left-0 w-[200px] h-[200px] animate-pulse"
              style={{ animationDuration: '15s' }}
            />
          </div>
          
          <div className="relative z-20 flex items-center">
            <Image
              src="/logo.svg"
              alt="Логотип"
              width={126}
              height={48}
              priority
              className="h-auto w-auto"
            />
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Эта библиотека сэкономила мне бесчисленное количество часов работы и
                помогла быстрее предоставить моим клиентам потрясающие дизайны.&rdquo;
              </p>
              <footer className="text-sm">София Дэвис</footer>
            </blockquote>
          </div>
        </div>
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
