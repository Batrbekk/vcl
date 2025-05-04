import * as z from "zod"

export const cardSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().min(1, "Описание обязательно"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Выберите приоритет",
  }),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
})

export type CardFormValues = z.infer<typeof cardSchema> 