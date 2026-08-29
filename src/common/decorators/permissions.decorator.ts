import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'
/** Exige que o usuário tenha uma das permissões indicadas. */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)
