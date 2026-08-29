import { z } from 'zod'

/**
 * Corpo do `PUT /pets/:petId/medical`. Todos os campos opcionais; `null` limpa
 * o campo. Upsert 1:1 (substitui apenas o que vier).
 */
export const upsertPetMedicalSchema = z.object({
  allergies: z.string().trim().max(1000).nullable().optional(),
  medications: z.string().trim().max(1000).nullable().optional(),
  specialCare: z.string().trim().max(1000).nullable().optional(),
  medicalConditions: z.string().trim().max(1000).nullable().optional(),
  veterinarianName: z.string().trim().max(200).nullable().optional(),
  veterinarianPhone: z.string().trim().max(50).nullable().optional(),
})

export type UpsertPetMedicalDto = z.infer<typeof upsertPetMedicalSchema>
