import * as z from "zod"

export const registerFirstStepSchema = z.object({
  email: z.string().email({ message: "Введите корректный email" }),
  firstName: z.string().min(2, { message: "Имя должно содержать минимум 2 символа" }),
  lastName: z.string().min(2, { message: "Фамилия должна содержать минимум 2 символа" }),
  companyName: z.string().min(2, { message: "Название компании должно содержать минимум 2 символа" }),
})

export const registerSecondStepSchema = z.object({
  password: z.string()
    .min(8, { message: "Пароль должен содержать минимум 8 символов" })
    .regex(/[A-Z]/, { message: "Пароль должен содержать хотя бы одну заглавную букву" })
    .regex(/[a-z]/, { message: "Пароль должен содержать хотя бы одну строчную букву" })
    .regex(/[0-9]/, { message: "Пароль должен содержать хотя бы одну цифру" })
    .regex(/[^A-Za-z0-9]/, { message: "Пароль должен содержать хотя бы один специальный символ" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов")
})

export const resetPasswordEmailSchema = z.object({
  email: z.string().email('Введите корректный email'),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
    .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один специальный символ'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

export type RegisterFirstStepData = z.infer<typeof registerFirstStepSchema>
export type RegisterSecondStepData = z.infer<typeof registerSecondStepSchema>
export type RegisterFormData = RegisterFirstStepData & RegisterSecondStepData
export type LoginData = z.infer<typeof loginSchema>
export type ResetPasswordEmailData = z.infer<typeof resetPasswordEmailSchema>
export type ResetPasswordData = z.infer<typeof resetPasswordSchema> 