import { z } from 'zod'

export const replaceTagSchema = z.object({
  newTagId: z.string().min(1),
})

export type ReplaceTagDto = z.infer<typeof replaceTagSchema>
