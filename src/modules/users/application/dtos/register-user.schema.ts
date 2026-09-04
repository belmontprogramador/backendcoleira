import { z } from 'zod'
import { brPhoneSchema } from '../../../../common/utils/phone'

export const registerUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: brPhoneSchema.optional(),
})

export type RegisterUserDto = z.infer<typeof registerUserSchema>
