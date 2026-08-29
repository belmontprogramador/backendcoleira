import type { PetMedical } from '../../domain/entities/pet-medical.entity'

/**
 * Mapeia a entidade `PetMedical` para a resposta da API (camelCase).
 */
export class PetMedicalResponseMapper {
  static toResponse(medical: PetMedical) {
    return {
      petId: medical.petId,
      allergies: medical.allergies,
      medications: medical.medications,
      specialCare: medical.specialCare,
      medicalConditions: medical.medicalConditions,
      veterinarianName: medical.veterinarianName,
      veterinarianPhone: medical.veterinarianPhone,
      updatedAt: medical.updatedAt,
    }
  }
}
