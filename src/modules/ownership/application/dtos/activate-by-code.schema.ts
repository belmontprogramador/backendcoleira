import { z } from 'zod'

export const activateByCodeSchema = z.object({
  activationCode: z
    .string()
    .regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/, 'Código de ativação inválido'),
  petId: z.string().min(1),
})

export type ActivateByCodeDto = z.infer<typeof activateByCodeSchema>
