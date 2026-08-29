import { z } from 'zod'

/**
 * Alfabeto do public ID — 8 caracteres, sem ambíguos (I, O, 0, 1).
 * Mesma regra do value object `PublicId` (domínio nfc).
 * Flag `i`: aceita minúsculas (ex.: digitação manual no celular) e
 * normaliza para uppercase.
 */
const PUBLIC_ID_REGEX = /^[A-HJ-NP-Z2-9]{8}$/i

/** Schema do parâmetro de rota `:publicId` (rota pública `GET /p/:publicId`). */
export const publicIdParamSchema = z
  .string()
  .regex(PUBLIC_ID_REGEX, 'Public ID inválido')
  .transform(value => value.toUpperCase())

export type PublicIdParamDto = z.infer<typeof publicIdParamSchema>
