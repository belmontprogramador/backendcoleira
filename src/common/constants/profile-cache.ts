/**
 * Constantes do cache do perfil público (Fase 5).
 * Centraliza a chave e os TTLs para o use case (get/set) e a invalidação
 * (del) não divergirem.
 */
export const PROFILE_CACHE_KEY_PREFIX = 'profile:'

/** TTL padrão do perfil público (5 minutos). */
export const PROFILE_CACHE_TTL_SECONDS = 300

/** TTL reduzido quando o pet está em modo perdido (1 minuto). */
export const PROFILE_CACHE_TTL_LOST_SECONDS = 60

export function profileCacheKey(publicId: string): string {
  return `${PROFILE_CACHE_KEY_PREFIX}${publicId}`
}
