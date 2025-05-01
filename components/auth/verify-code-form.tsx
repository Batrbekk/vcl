"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from "@/components/ui/input-otp"
import { Form } from "@/components/ui/form"

const verifyCodeSchema = z.object({
  code: z.string().min(6, "Введите код полностью").max(6)
})

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>

interface VerifyCodeFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onVerify: (code: string) => Promise<void>
  email: string
  mode: 'register' | 'reset'
  onResend: () => Promise<void>
  isLoading?: boolean
  canResend?: boolean
  timeLeft?: number
}

export function VerifyCodeForm({ 
  className, 
  onVerify, 
  email,
  mode,
  onResend,
  isLoading: externalIsLoading,
  canResend = true,
  timeLeft = 0,
  ...props 
}: VerifyCodeFormProps) {
  const [code, setCode] = React.useState("")

  const form = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  })

  React.useEffect(() => {
    form.setValue("code", code)
  }, [code, form])

  const onSubmit = async (data: VerifyCodeFormData) => {
    try {
      await onVerify(data.code)
    } catch (error) {
      console.error(error)
      setCode("")
    }
  }

  const handleResend = async () => {
    try {
      setCode("")
      await onResend()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Подтверждение {mode === 'register' ? 'регистрации' : 'сброса пароля'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Введите код, отправленный на {email}
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              className="gap-2"
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSeparator className="mx-2" />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              disabled={externalIsLoading || code.length !== 6}
              className="bg-[#09090F] hover:bg-[#09090F]/90 w-full cursor-pointer"
            >
              {externalIsLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Подтвердить
            </Button>
            <Button
              type="button"
              variant="link"
              disabled={externalIsLoading || !canResend}
              onClick={handleResend}
              className="text-sm text-muted-foreground hover:text-primary cursor-pointer"
            >
              {canResend ? (
                'Отправить код повторно'
              ) : (
                `Отправить код повторно через ${timeLeft} сек`
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 