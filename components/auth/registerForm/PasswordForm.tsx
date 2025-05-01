"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRegisterStore } from "@/store/register-store"
import { registerSecondStepSchema, RegisterSecondStepData } from "@/lib/validations/auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Icons } from "@/components/icons"
import { Eye, EyeOff } from "lucide-react"

export function PasswordForm() {
  const [showPassword, setShowPassword] = React.useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState<boolean>(false)
  const { secondStepData, setSecondStepData, prevStep, register, isLoading } = useRegisterStore()
  const router = useRouter()

  const form = useForm<RegisterSecondStepData>({
    resolver: zodResolver(registerSecondStepSchema),
    defaultValues: {
      password: secondStepData?.password || "",
      confirmPassword: secondStepData?.confirmPassword || "",
    },
    mode: "onChange"
  })

  const onSubmit = async (data: RegisterSecondStepData) => {
    try {
      setSecondStepData(data)
      const result = await register()
      if (!result.success) {
        toast.error(result.error || 'Произошла ошибка при регистрации')
      } else {
        toast.success('Регистрация успешна! Проверьте вашу почту для подтверждения')
        if (result.email) {
          router.push(`/verify?email=${encodeURIComponent(result.email)}&mode=register`)
        }
      }
    } catch {
      toast.error('Произошла ошибка при регистрации')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль" 
                    {...field}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Подтверждение пароля" 
                    {...field}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
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
            Зарегистрироваться
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isLoading}
          >
            Назад
          </Button>
        </div>
      </form>
    </Form>
  )
} 