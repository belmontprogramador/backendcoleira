import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { ACCESS_EVENT_REPOSITORY_PORT } from '../../domain/repositories/access-event.repository.port'
import type { AccessEventRepositoryPort } from '../../domain/repositories/access-event.repository.port'
import { AccessEvent } from '../../domain/entities/access-event.entity'
import { AccessSource } from '../../../../common/constants/access-source'

export interface RegisterAccessEventInput {
  petId?: string | null
  nfcTagId?: string | null
  source: AccessSource
  deviceType?: string | null
  ipHash?: string | null
  locationApprox?: string | null
}

/**
 * Caso de uso: registrar um acesso ao perfil público (RF18, append-only).
 * Sem fila — INSERT síncrono e rápido. Chamado como side-effect pelo
 * `GetPublicProfileUseCase` (que engole a falha — RNF10).
 */
@Injectable()
export class RegisterAccessEventUseCase {
  constructor(
    @Inject(ACCESS_EVENT_REPOSITORY_PORT)
    private readonly events: AccessEventRepositoryPort,
  ) {}

  async execute(input: RegisterAccessEventInput): Promise<AccessEvent> {
    const event = AccessEvent.create({
      id: randomUUID(),
      petId: input.petId ?? null,
      nfcTagId: input.nfcTagId ?? null,
      source: input.source,
      deviceType: input.deviceType ?? null,
      ipHash: input.ipHash ?? null,
      locationApprox: input.locationApprox ?? null,
    })

    await this.events.create(event)
    return event
  }
}
