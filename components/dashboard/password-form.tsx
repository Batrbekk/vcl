import { useState } from "react"
import { useUserStore } from "@/store/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function PasswordForm() {
  const { changePassword } = useUserStore()
  const [formData, setFormData] = useState({
    currentPassword: "",
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
      const changePasswordData = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }

      const success = await changePassword(changePasswordData)
      if (success) {
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
      }
    } catch (error) {
      console.error('Error changing password:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Текущий пароль</Label>
        <Input
          id="currentPassword"
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
          required
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