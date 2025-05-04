"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Manager } from "@/store/managers-store"
import { Edit2, Eye, EyeOff } from "lucide-react"
import { editManagerSchema, EditManagerFormData } from "@/lib/validations/manager"
import { Icons } from "@/components/icons"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"

interface EditManagerDialogProps {
  manager: Manager
  onEdit: (manager: Manager) => void
}

export function EditManagerDialog({ manager, onEdit }: EditManagerDialogProps) {
  const [open, setOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<EditManagerFormData>({
    resolver: zodResolver(editManagerSchema),
    defaultValues: {
      email: manager.email || "",
      firstName: manager.firstName || "",
      lastName: manager.lastName || "",
      password: "",
    },
  })

  const onSubmit = async (data: EditManagerFormData) => {
    try {
      // Если пароль пустой, удаляем его из данных
      if (!data.password) {
        const { email, firstName, lastName } = data
        await onEdit({ ...manager, email, firstName, lastName })
      } else {
        await onEdit({ ...manager, ...data })
      }
      setOpen(false)
    } catch (error) {
      console.error("Error updating manager:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать менеджера</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Email" 
                      type="email" 
                      {...field}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Имя" 
                      {...field}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Фамилия" 
                      {...field}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Новый пароль" 
                        {...field}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 