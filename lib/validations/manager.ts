import * as z from "zod"

export const managerSchema = z.object({
  email: z.string().email("Некорректный email адрес"),
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру")
})

export const editManagerSchema = z.object({
  email: z.string().email("Некорректный email адрес"),
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  password: z.string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру")
    .optional()
    .or(z.literal(''))
})

export type ManagerFormData = z.infer<typeof managerSchema>
export type EditManagerFormData = z.infer<typeof editManagerSchema> 