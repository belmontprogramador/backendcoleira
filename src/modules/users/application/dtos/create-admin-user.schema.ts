import { z } from 'zod'

/**
 * Roles criáveis pela rota dedicada `POST /admin/users` (exclusiva de
 * SUPER_ADMIN). Diferente do `update-user-role`, aqui SUPER_ADMIN é permitido:
 * só outro SUPER_ADMIN pode criar um novo SUPER_ADMIN ou ADMIN.
 */
export const ADMIN_USER_ROLE_VALUES = ['ADMIN', 'SUPER_ADMIN'] as const

export const createAdminUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ADMIN_USER_ROLE_VALUES),
})

export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>
