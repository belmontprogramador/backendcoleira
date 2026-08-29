import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
/** Marca uma rota como pública (ignorada pelo guard de autenticação). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
