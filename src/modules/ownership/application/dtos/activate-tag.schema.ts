import { z } from 'zod'

export const activateTagSchema = z.object({
  activationCode: z
    .string()
    .regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/, 'Código de ativação inválido'),
})

export type ActivateTagDto = z.infer<typeof activateTagSchema>
