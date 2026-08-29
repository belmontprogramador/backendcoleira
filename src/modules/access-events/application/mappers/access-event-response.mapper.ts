import type { AccessEvent } from '../../domain/entities/access-event.entity'

/**
 * Mapeia a entidade `AccessEvent` para a resposta da API (camelCase).
 * NUNCA expõe `ipHash` nem `nfcTagId` (dados sensíveis/internos).
 */
export class AccessEventResponseMapper {
  static toResponse(event: AccessEvent) {
    return {
      id: event.id,
      petId: event.petId,
      source: event.source,
      deviceType: event.deviceType,
      locationApprox: event.locationApprox,
      createdAt: event.createdAt,
    }
  }
}
