import { z } from 'zod'

/**
 * Normaliza um telefone brasileiro para o formato E.164 canônico
 * `+55DDDnúmero` (com o `+`).
 *
 * Aceita entradas comuns:
 *   - "(11) 99999-9999"  → +5511999999999
 *   - "+55 (11) 99999-9999" → +5511999999999
 *   - "5511999999999"    → +5511999999999
 *   - "11999999999"      → +5511999999999
 *   - "011 99999-9999"   → +5511999999999 (prefixo "0" de DDD antigo)
 *   - "(11) 9999-9999"   → +551199999999 (fixo)
 *
 * Retorna `null` quando o valor é vazio ou não é um telefone BR reconhecível.
 */
export function normalizeBrPhone(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null
  }

  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) {
    return null
  }

  // Remove o "0" prefixo de DDD do formato antigo ("011 99999-9999").
  let d = digits
  if (d.startsWith('0') && (d.length === 11 || d.length === 12)) {
    d = d.slice(1)
  }

  let canonical: string | null = null
  if (d.length === 13 && d.startsWith('55')) {
    canonical = d // celular já com DDI
  } else if (d.length === 12 && d.startsWith('55')) {
    canonical = d // fixo já com DDI
  } else if (d.length === 11) {
    canonical = `55${d}` // celular sem DDI
  } else if (d.length === 10) {
    canonical = `55${d}` // fixo sem DDI
  }

  if (canonical === null) {
    return null
  }
  return `+${canonical}`
}

/**
 * Indica se um telefone já normalizado é um celular (E.164 `+55` + 13 dígitos),
 * que é o alvo válido para envio de WhatsApp. Fixo (12 dígitos) retorna false.
 */
export function isBrMobile(normalized: string): boolean {
  return normalized.length === 14 && normalized.startsWith('+55')
}

/**
 * Converte um telefone cru no número esperado pela Evolution API
 * (`DDI+DDD+NÚMERO`, só dígitos, sem `+`).
 *
 * Retorna `null` quando não é um celular (vazio, inválido ou fixo) — nesse
 * caso o envio de WhatsApp deve ser pulado (o canal e-mail segue).
 */
export function toWhatsAppNumber(
  raw: string | null | undefined,
): string | null {
  const normalized = normalizeBrPhone(raw)
  if (normalized === null || !isBrMobile(normalized)) {
    return null
  }
  return normalized.slice(1) // remove o '+'
}

/**
 * Schema Zod para campo de telefone opcional.
 * - `null` / `undefined` / string vazia → `null` (sem telefone).
 * - string válida → normalizada para E.164 (`+55DDDnúmero`).
 * - string inválida → erro de validação.
 */
export const brPhoneSchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.union([z.string(), z.null()]),
  )
  .refine(
    (value) => value == null || value === '' || normalizeBrPhone(value) !== null,
    { message: 'Telefone inválido' },
  )
  .transform((value): string | null => {
    if (value == null || value === '') {
      return null
    }
    return normalizeBrPhone(value)!
  })
