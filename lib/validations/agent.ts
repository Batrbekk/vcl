import * as z from "zod"

export const createAgentSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
})

export type CreateAgentFormValues = z.infer<typeof createAgentSchema> 