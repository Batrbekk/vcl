import { useState } from "react"
import { useUserStore } from "@/store/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function PasswordForm() {
  const { user } = useUserStore()
  const [formData, setFormData] = useState({
    email: user?.email || "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Пароли не совпадают")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          newPassword: formData.newPassword,
        }),
      })

      if (response.ok) {
        toast.success("Пароль успешно изменен")
        setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }))
      } else {
        const error = await response.json()
        toast.error(error.message || "Ошибка при смене пароля")
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error("Произошла ошибка при смене пароля")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          disabled
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Новый пароль</Label>
        <Input
          id="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          required
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Сохранение..." : "Изменить пароль"}
      </Button>
    </form>
  )
} 