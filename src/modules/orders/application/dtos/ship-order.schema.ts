import { z } from 'zod'

/**
 * DTO do despacho (`POST /admin/orders/:id/ship`).
 *
 * No MVP a etiqueta é gerada manualmente no painel da Melhor Envio; o admin
 * apenas confirma a postagem e, opcionalmente, registra os 3 campos da etiqueta
 * (`meOrderId`/`protocol`/`serviceId`) — sempre juntos — para o rastreio.
 */
export const shipOrderSchema = z
  .object({
    meOrderId: z.string().trim().min(1).optional(),
    protocol: z.string().trim().min(1).optional(),
    serviceId: z.coerce.number().int().min(1).optional(),
    tracking: z.string().trim().min(1).optional(),
    trackingUrl: z.string().trim().min(1).optional(),
    labelUrl: z.string().trim().min(1).optional(),
    document: z.string().trim().min(11).max(18).optional(),
  })
  .refine(
    data => {
      const hasAny =
        data.meOrderId !== undefined ||
        data.protocol !== undefined ||
        data.serviceId !== undefined
      const hasAll =
        data.meOrderId !== undefined &&
        data.protocol !== undefined &&
        data.serviceId !== undefined
      return !hasAny || hasAll
    },
    {
      message: 'meOrderId, protocol e serviceId devem ser informados juntos',
      path: ['meOrderId'],
    },
  )

export type ShipOrderDto = z.infer<typeof shipOrderSchema>
