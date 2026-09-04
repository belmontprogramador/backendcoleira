import { z } from 'zod'

/**
 * Body do `POST /p/:publicId/location` — reporta o GPS do navegador do
 * visitante (com permissão) para amarrar ao acesso recém-criado.
 *
 * - `access_id`   → id do AccessEvent devolvido no `GET /p/:publicId`.
 * - `latitude`/`longitude` → coordenadas (opcionais: ausentes = permissão
 *   negada, fallback IP na F2).
 */
export const reportAccessLocationSchema = z
  .object({
    access_id: z.string().min(1),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((v) => (v.latitude == null) === (v.longitude == null), {
    message: 'latitude e longitude devem ser informadas juntas',
  })

export type ReportAccessLocationDto = z.infer<
  typeof reportAccessLocationSchema
>
