import { z } from 'zod'

/**
 * Telefone do visitante — permissivo (não exige E.164). Aceita dígitos,
 * espaços, parênteses, hífen e prefixo `+`; 8 a 20 caracteres.
 */
const PHONE_REGEX = /^\+?[0-9()\s-]{8,20}$/

/**
 * Corpo do endpoint público `POST /p/:publicId/contact` (RF14, Basic).
 * Rota pública — nomes de campos em snake_case (consistente com o perfil).
 */
export const contactSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Mensagem obrigatória')
    .max(1000, 'Mensagem excede 1000 caracteres'),
  sender_name: z
    .string()
    .trim()
    .max(100, 'Nome excede 100 caracteres')
    .optional(),
  sender_phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Telefone inválido')
    .optional(),
  sender_email: z
    .string()
    .trim()
    .email('E-mail inválido')
    .max(254, 'E-mail excede 254 caracteres')
    .optional(),
  source: z.enum(['nfc', 'qr', 'direct']).optional().default('direct'),
})

export type ContactDto = z.infer<typeof contactSchema>
