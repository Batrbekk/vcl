"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { VerifyCodeForm } from "@/components/auth/verify-code-form"
import { useVerifyStore } from "@/store/verify-store"
import { AuthDecorator } from "@/components/auth/auth-decorator"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const mode = (searchParams.get("mode") as "register" | "reset") || "register"
  const { verifyCode, sendCode, isLoading, canResend, timeLeft } = useVerifyStore()
  const isInitialSend = useRef(false)

  useEffect(() => {
    if (!email) {
      router.push("/")
      return
    }
    
    if (!isInitialSend.current) {
      isInitialSend.current = true
      sendCode(email, mode)
    }
  }, [email, mode, router, sendCode])

  const handleVerify = async (code: string) => {
    if (!email) return
    await verifyCode(email, code, mode)
  }

  const handleResend = async () => {
    if (!email) return
    await sendCode(email, mode)
  }

  if (!email) {
    return null
  }

  return (
    <>
      <div className="container relative min-h-screen flex flex-col items-center justify-center px-4 md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <AuthDecorator />
        <div className="flex items-center justify-center w-full py-12 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <VerifyCodeForm
              email={email}
              mode={mode}
              onVerify={handleVerify}
              onResend={handleResend}
              isLoading={isLoading}
              canResend={canResend}
              timeLeft={timeLeft}
            />
          </div>
        </div>
      </div>
    </>
  )
} 