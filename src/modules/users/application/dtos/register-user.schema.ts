import { z } from 'zod'

export const registerUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

export type RegisterUserDto = z.infer<typeof registerUserSchema>
