import { Inject, Injectable } from '@nestjs/common'
import { NFC_TAG_REPOSITORY_PORT } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../../nfc/domain/repositories/nfc-tag.repository.port'
import { ACCESS_EVENT_REPOSITORY_PORT } from '../../../access-events/domain/repositories/access-event.repository.port'
import type { AccessEventRepositoryPort } from '../../../access-events/domain/repositories/access-event.repository.port'
import { PET_REPOSITORY_PORT } from '../../../pets/domain/repositories/pet.repository.port'
import type { PetRepositoryPort } from '../../../pets/domain/repositories/pet.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { CACHE_PORT } from '../../../../common/ports/cache.port'
import type { CachePort } from '../../../../common/ports/cache.port'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { ACCESS_HISTORY_FEATURE } from '../../../../common/constants/features'
import { AccessSource } from '../../../../common/constants/access-source'
import type { NfcTag } from '../../../nfc/domain/entities/nfc-tag.entity'
import { TagNotFoundError } from '../../../nfc/application/errors'
import {
  AccessEventNotFoundError,
  AccessEventLocationInvalidError,
} from '../../../access-events/application/errors'

export interface ReportAccessLocationInput {
  publicId: string
  accessId: string
  latitude: number | null
  longitude: number | null
}

/**
 * Janela em que o GPS pode ser reportado após o scan (anti-abuso). O navegador
 * reporta ~2-5s depois do fetch do perfil; 15min é folga de sobra sem permitir
 * atualizar acessos antigos.
 */
const ACCESS_LOCATION_REPORT_WINDOW_MS = 15 * 60 * 1000

/** Janela mínima entre alertas de acesso por pet (anti-spam, doc-sistema §11). */
const SCAN_ALERT_THROTTLE_SECONDS = 600

/**
 * Caso de uso: reportar a localização GPS do visitante (com permissão do
 * navegador) e amarrá-la ao `AccessEvent` criado no scan.
 *
 * Rota pública (não autenticada) — a defesa é: o `access_id` deve pertencer ao
 * pingente (`publicId`) e o evento deve ser recente.
 *
 * Side-effect (doc-sistema §11): dispara o e-mail de acesso ao tutor. O e-mail
 * é adiado até aqui (em vez do fetch do perfil) para que o GPS reportado pelo
 * navegador chegue antes. Fire em TODO escaneamento (não só pet perdido),
 * gateado por Premium (`ACCESS_HISTORY`) + throttle de 600s. Sem coordenadas
 * (permissão negada) → fallback para a localização IP armazenada no evento.
 */
@Injectable()
export class ReportAccessLocationUseCase {
  constructor(
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ACCESS_EVENT_REPOSITORY_PORT)
    private readonly events: AccessEventRepositoryPort,
    @Inject(PET_REPOSITORY_PORT)
    private readonly pets: PetRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
    @Inject(EMAIL_SENDER_PORT)
    private readonly email: EmailSenderPort,
  ) {}

  async execute(input: ReportAccessLocationInput): Promise<void> {
    const tag = await this.tags.findByPublicId(input.publicId)
    if (!tag) {
      throw new TagNotFoundError(input.publicId)
    }

    const event = await this.events.findById(input.accessId)
    if (!event) {
      throw new AccessEventNotFoundError(input.accessId)
    }

    // Anti-abuso: o evento deve pertencer a este pingente e ser recente.
    if (event.nfcTagId !== tag.id) {
      throw new AccessEventLocationInvalidError(input.accessId)
    }
    const ageMs = Date.now() - event.createdAt.getTime()
    if (ageMs < 0 || ageMs > ACCESS_LOCATION_REPORT_WINDOW_MS) {
      throw new AccessEventLocationInvalidError(input.accessId)
    }

    if (input.latitude !== null && input.longitude !== null) {
      await this.events.updateLocation(
        event.id,
        input.latitude,
        input.longitude,
      )
    }

    await this.notifyScan(
      tag,
      event.source,
      event.locationApprox,
      input.latitude,
      input.longitude,
    )
  }

  /**
   * E-mail de acesso ao tutor (todo scan, Premium `ACCESS_HISTORY`, throttled).
   * Usa o GPS reportado quando presente; senão, a localização IP do evento.
   */
  private async notifyScan(
    tag: NfcTag,
    source: AccessSource,
    locationApprox: string | null,
    latitude: number | null,
    longitude: number | null,
  ): Promise<void> {
    if (!tag.petId || !tag.ownerId) {
      return
    }

    const throttleKey = `scan-alert:${tag.petId}`
    if (await this.cache.get(throttleKey)) {
      return
    }

    const pet = await this.pets.findById(tag.petId)
    if (!pet || pet.deletedAt !== null) {
      return
    }

    const hasAlert = await this.featureAccess.hasFeature(
      tag.ownerId,
      ACCESS_HISTORY_FEATURE,
    )
    if (!hasAlert) {
      return
    }

    const owner = await this.users.findById(tag.ownerId)
    if (!owner) {
      return
    }

    await this.cache.set(throttleKey, '1', SCAN_ALERT_THROTTLE_SECONDS)

    try {
      await this.email.sendScanAlertEmail(owner.email.value, {
        petName: pet.name,
        source,
        location: locationApprox,
        latitude,
        longitude,
      })
    } catch {
      // best-effort: falha de e-mail nunca derruba o report de localização.
    }
  }
}
