import { z } from 'zod'

export const privacySchema = z.object({
  showPhone: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showCity: z.boolean().optional(),
  showMedical: z.boolean().optional(),
  showVeterinarian: z.boolean().optional(),
  showBehavior: z.boolean().optional(),
  showContacts: z.boolean().optional(),
})

export type PrivacyDto = z.infer<typeof privacySchema>
