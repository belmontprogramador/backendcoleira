import { reportAccessLocationSchema } from '../report-access-location.schema'

describe('reportAccessLocationSchema', () => {
  it('aceita access_id + coordenadas', () => {
    const result = reportAccessLocationSchema.safeParse({
      access_id: 'ev-1',
      latitude: -22.9068,
      longitude: -43.1729,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        access_id: 'ev-1',
        latitude: -22.9068,
        longitude: -43.1729,
      })
    }
  })

  it('aceita access_id sem coordenadas (permissão negada)', () => {
    const result = reportAccessLocationSchema.safeParse({ access_id: 'ev-1' })
    expect(result.success).toBe(true)
  })

  it('rejeita latitude fora do range', () => {
    const result = reportAccessLocationSchema.safeParse({
      access_id: 'ev-1',
      latitude: 999,
      longitude: -43.1729,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita quando latitude e longitude não vêm juntas', () => {
    const result = reportAccessLocationSchema.safeParse({
      access_id: 'ev-1',
      latitude: -22.9068,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita access_id ausente', () => {
    const result = reportAccessLocationSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
