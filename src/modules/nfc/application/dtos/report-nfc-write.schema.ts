import { z } from 'zod'

export const reportNfcWriteSchema = z.object({
  publicId: z.string().min(1).max(10),
  uid: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'UID inválido'),
  matched: z.boolean(),
})

export type ReportNfcWriteDto = z.infer<typeof reportNfcWriteSchema>
