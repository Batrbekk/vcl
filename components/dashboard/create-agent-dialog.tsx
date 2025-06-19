import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreateAgentFormValues, createAgentSchema } from "@/lib/validations/agent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CreateAgentData } from "@/store/agent-store"
import { useRouter } from "next/navigation"

interface CreateAgentDialogProps {
  onSubmit: (data: CreateAgentData) => Promise<string | null>
}

export function CreateAgentDialog({ onSubmit }: CreateAgentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const form = useForm<CreateAgentFormValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
    }
  })

  const handleSubmit = async (data: CreateAgentFormValues) => {
    setIsLoading(true)
    try {
      const agentId = await onSubmit(data)
      if (agentId) {
        setIsOpen(false)
        form.reset()
        // Перенаправляем на страницу детального редактирования
        router.push(`/dashboard/agents/detail/${agentId}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover:!bg-korn/20 cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Новый агент
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать нового агента</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя агента</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Введите имя агента" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                className="cursor-pointer bg-korn/20 text-korn hover:!bg-korn/30"
                disabled={isLoading}
              >
                {isLoading ? "Создание..." : "Создать агента"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 