import { z } from 'zod'

/**
 * DTO do checkout próprio (`POST /subscriptions/checkout`).
 * `cardToken` é obrigatório apenas para pagamento com cartão (gerado no
 * front-end pelo MercadoPago.js).
 */
export const checkoutSchema = z
  .object({
    planId: z.string().min(1),
    paymentMethod: z.enum(['PIX', 'CARD', 'BOLETO']),
    cardToken: z.string().min(1).optional(),
  })
  .refine(data => data.paymentMethod !== 'CARD' || !!data.cardToken, {
    message: 'cardToken é obrigatório para pagamento com cartão',
    path: ['cardToken'],
  })

export type CheckoutDto = z.infer<typeof checkoutSchema>
