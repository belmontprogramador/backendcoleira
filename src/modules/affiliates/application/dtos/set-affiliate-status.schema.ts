import { z } from 'zod'

export const setAffiliateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export type SetAffiliateStatusDto = z.infer<typeof setAffiliateStatusSchema>
