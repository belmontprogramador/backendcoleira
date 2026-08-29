import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'
/** Exige que o usuário tenha uma das roles indicadas. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
