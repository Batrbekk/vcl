"use client"

import * as React from "react"
import { useRegisterStore } from "@/store/register-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { PersonalDataForm } from "./registerForm/PersonalDataForm"
import { PasswordForm } from "./registerForm/PasswordForm"

export function UserAuthForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { step } = useRegisterStore()

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {step === 1 ? <PersonalDataForm /> : <PasswordForm />}

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
        className="border-[#09090F] text-[#09090F] hover:bg-[#09090F]/10"
      >
        <Icons.google className="mr-2 h-4 w-4" />
        Google
      </Button>
    </div>
  )
} 