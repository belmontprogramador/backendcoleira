import { z } from 'zod'
import { brPhoneSchema } from '../../../../common/utils/phone'

/**
 * Campos editáveis por um ADMIN sobre um usuário cliente (role inferior).
 * Dados sensíveis (email, senha, role) NÃO são editáveis por aqui — role tem
 * rota própria (só SUPER_ADMIN) e email/senha têm fluxos dedicados.
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: brPhoneSchema.optional(),
})

export type AdminUpdateUserDto = z.infer<typeof adminUpdateUserSchema>
