import { PetMedical } from '../../domain/entities/pet-medical.entity'
import type { PetMedicalModel } from '../../../../generated/prisma/models/PetMedical'

/**
 * Converte a entidade `PetMedical` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class PetMedicalMapper {
  static toPersistence(medical: PetMedical): {
    pet_id: string
    allergies: string | null
    medications: string | null
    special_care: string | null
    medical_conditions: string | null
    veterinarian_name: string | null
    veterinarian_phone: string | null
    created_at: Date
    updated_at: Date
  } {
    return {
      pet_id: medical.petId,
      allergies: medical.allergies,
      medications: medical.medications,
      special_care: medical.specialCare,
      medical_conditions: medical.medicalConditions,
      veterinarian_name: medical.veterinarianName,
      veterinarian_phone: medical.veterinarianPhone,
      created_at: medical.createdAt,
      updated_at: medical.updatedAt,
    }
  }

  static toDomain(model: PetMedicalModel): PetMedical {
    return PetMedical.reconstitute({
      petId: model.pet_id,
      allergies: model.allergies,
      medications: model.medications,
      specialCare: model.special_care,
      medicalConditions: model.medical_conditions,
      veterinarianName: model.veterinarian_name,
      veterinarianPhone: model.veterinarian_phone,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
