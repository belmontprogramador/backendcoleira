import { z } from 'zod'

/**
 * DTO do checkout próprio (`POST /subscriptions/checkout`).
 *
 * - PIX: só `planId` + `paymentMethod`.
 * - BOLETO: exige `payerIdentificationNumber` (CPF/CNPJ do pagador).
 * - CARD: exige `cardToken` (MercadoPago.js), `cardPaymentMethodId` (bandeira),
 *   `cardIssuerId` (banco emissor) e `payerIdentificationNumber` (CPF).
 */
export const checkoutSchema = z
  .object({
    planId: z.string().min(1),
    paymentMethod: z.enum(['PIX', 'CARD', 'BOLETO']),
    cardToken: z.string().min(1).optional(),
    cardPaymentMethodId: z.string().min(1).optional(),
    cardInstallments: z.coerce.number().int().min(1).max(12).optional(),
    cardIssuerId: z.string().min(1).optional(),
    payerIdentificationType: z.string().min(1).optional(),
    payerIdentificationNumber: z.string().min(1).optional(),
    payerFirstName: z.string().min(1).optional(),
    payerLastName: z.string().min(1).optional(),
  })
  .refine(data => data.paymentMethod !== 'CARD' || !!data.cardToken, {
    message: 'cardToken é obrigatório para pagamento com cartão',
    path: ['cardToken'],
  })
  .refine(
    data =>
      data.paymentMethod !== 'CARD' ||
      (!!data.cardPaymentMethodId && !!data.cardIssuerId),
    {
      message:
        'cardPaymentMethodId e cardIssuerId são obrigatórios para cartão',
      path: ['cardPaymentMethodId'],
    },
  )
  .refine(
    data =>
      !['CARD', 'BOLETO'].includes(data.paymentMethod) ||
      !!data.payerIdentificationNumber,
    {
      message: 'CPF/CNPJ é obrigatório para cartão e boleto',
      path: ['payerIdentificationNumber'],
    },
  )

export type CheckoutDto = z.infer<typeof checkoutSchema>
