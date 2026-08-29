import { z } from 'zod'
import { Role } from '../../../../common/constants/roles'

/**
 * Valores aceitos no filtro `role` (query param, CSV).
 *
 * `NONE` é um valor especial: filtra usuários **sem role atribuída** (clientes
 * que registraram via `/auth/register` e nunca receberam role).
 */
export const ROLE_FILTER_VALUES: readonly string[] = [
  Role.USER,
  Role.SUPPORT,
  Role.OPERATOR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
  'NONE',
]

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_VERIFICATION'])
    .optional(),
  role: z
    .string()
    .optional()
    .transform(value =>
      value === undefined
        ? undefined
        : value
            .split(',')
            .map(token => token.trim().toUpperCase())
            .filter(Boolean),
    )
    .refine(
      roles =>
        roles === undefined ||
        roles.every(role => ROLE_FILTER_VALUES.includes(role)),
      {
        message:
          'role inválido (USER, SUPPORT, OPERATOR, ADMIN, SUPER_ADMIN ou NONE)',
      },
    ),
})

export type ListUsersDto = z.infer<typeof listUsersSchema>
