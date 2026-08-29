import { z } from 'zod'

/**
 * Roles atribuíveis via promoção/rebaixamento (setRole).
 *
 * SUPER_ADMIN NÃO está aqui: um usuário nunca vira SUPER_ADMIN por promoção
 * (regra de negócio). SUPER_ADMIN só nasce pela rota dedicada de criação
 * (`POST /admin/users`), que é exclusiva de outro SUPER_ADMIN.
 */
export const USER_ROLE_VALUES = [
  'USER',
  'SUPPORT',
  'OPERATOR',
  'ADMIN',
] as const

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLE_VALUES),
})

export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>
