import { updatePlanSchema } from '../update-plan.schema'

describe('updatePlanSchema', () => {
  it('aceita priceCents válido', () => {
    const result = updatePlanSchema.safeParse({ priceCents: 2990 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priceCents).toBe(2990)
    }
  })

  it('aceita name e description', () => {
    const result = updatePlanSchema.safeParse({
      name: 'Premium Plus',
      description: 'Novo plano',
    })
    expect(result.success).toBe(true)
  })

  it('aceita description null (limpar)', () => {
    const result = updatePlanSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('rejeita priceCents negativo', () => {
    expect(updatePlanSchema.safeParse({ priceCents: -1 }).success).toBe(false)
  })

  it('rejeita priceCents não inteiro', () => {
    expect(updatePlanSchema.safeParse({ priceCents: 19.9 }).success).toBe(false)
  })

  it('rejeita objeto vazio (nenhum campo)', () => {
    expect(updatePlanSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita name vazio', () => {
    expect(updatePlanSchema.safeParse({ name: '   ' }).success).toBe(false)
  })
})
