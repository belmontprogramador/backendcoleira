import { z } from 'zod'

export const shipToSchema = z.object({
  postalCode: z.string().min(8),
  street: z.string().trim().min(1),
  number: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(2).max(2),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
})

/**
 * DTO do checkout da venda (`POST /orders`).
 *
 * - PIX: só `productId` + `shipTo` + `freightServiceId` + `paymentMethod`.
 * - BOLETO/CARTÃO: exige `payerIdentificationNumber` (CPF/CNPJ do pagador).
 * - CARTÃO: exige `cardToken`, `cardPaymentMethodId` (bandeira) e `cardIssuerId`.
 */
export const createOrderSchema = z
  .object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(1).max(10).default(1),
    shipTo: shipToSchema,
    freightServiceId: z.coerce.number().int().min(1),
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

export type CreateOrderDto = z.infer<typeof createOrderSchema>
