import { z } from 'zod'
import { GRANULARITY_VALUES } from '../../domain/repositories/dashboard-metrics.port'

/**
 * Query params do `GET /admin/dashboard`.
 *
 * - `from`/`to` → período (datas ISO). Default: últimos 30 dias (resolvido no
 *   use case).
 * - `granularity` → bucket das séries temporais (`day`/`week`/`month`).
 */
export const dashboardQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    granularity: z.enum(GRANULARITY_VALUES).default('day'),
  })
  .superRefine((value, ctx) => {
    if (value.from && Number.isNaN(value.from.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'from deve ser uma data válida',
        path: ['from'],
      })
    }
    if (value.to && Number.isNaN(value.to.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'to deve ser uma data válida',
        path: ['to'],
      })
    }
  })

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>
