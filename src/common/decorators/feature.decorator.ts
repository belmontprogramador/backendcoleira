import { SetMetadata } from '@nestjs/common'

export const FEATURES_KEY = 'features'

/**
 * Exige que o usuário tenha TODAS as features indicadas (Feature System).
 * Uso: `@Feature('PET_MEDICAL')`.
 */
export const Feature = (...features: string[]) =>
  SetMetadata(FEATURES_KEY, features)
