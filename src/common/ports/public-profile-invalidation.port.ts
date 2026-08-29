/**
 * Porta de invalidação do cache do perfil público.
 *
 * DIP: os use cases de pets e ownership dependem desta abstração (transversal)
 * em vez de dependerem diretamente do `CachePort` + `NfcTagRepositoryPort`.
 * A implementação concreta vive na infraestrutura do módulo public-profile.
 */
export interface PublicProfileInvalidationPort {
  /** Invalida a chave `profile:{publicId}` diretamente. */
  invalidateByPublicId(publicId: string): Promise<void>
  /** Descobre as tags do pet e invalida a chave de cada `publicId`. */
  invalidateByPetId(petId: string): Promise<void>
}

export const PUBLIC_PROFILE_INVALIDATION_PORT = Symbol(
  'PUBLIC_PROFILE_INVALIDATION_PORT',
)
