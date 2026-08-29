import { z } from 'zod'

export const verifyNfcSchema = z.object({
  publicId: z.string().min(1).max(10),
  uid: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'UID inválido')
    .optional(),
})

export type VerifyNfcDto = z.infer<typeof verifyNfcSchema>
