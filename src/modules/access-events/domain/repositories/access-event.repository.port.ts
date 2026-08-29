import type { AccessEvent } from '../entities/access-event.entity'

/**
 * Porta do repositório de eventos de acesso (append-only).
 * A leitura/histórico é feature Premium (Fase 7) — nesta fase só registramos.
 */
export interface AccessEventRepositoryPort {
  create(event: AccessEvent): Promise<void>
  listByPet(petId: string): Promise<AccessEvent[]>
}

export const ACCESS_EVENT_REPOSITORY_PORT = Symbol(
  'ACCESS_EVENT_REPOSITORY_PORT',
)
