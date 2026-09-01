import { z } from 'zod'

export const reportNfcWriteSchema = z.object({
  publicId: z.string().min(1).max(10),
  // UID opcional (Web NFC pode não expor serialNumber). 6 ou 7 bytes,
  // com separador (`XX:XX:...`) ou hex cru.
  uid: z
    .string()
    .regex(
      /^(?:[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5,6}|[0-9A-Fa-f]{12}|[0-9A-Fa-f]{14})$/,
      'UID inválido',
    )
    .optional(),
  matched: z.boolean(),
})

export type ReportNfcWriteDto = z.infer<typeof reportNfcWriteSchema>
