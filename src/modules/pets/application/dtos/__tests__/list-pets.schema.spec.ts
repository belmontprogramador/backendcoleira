import { listPetsSchema } from '../list-pets.schema'

describe('listPetsSchema', () => {
  it('aplica defaults page=1 e limit=20', () => {
    const result = listPetsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ page: 1, limit: 20 })
    }
  })

  it('aceita ownerId opcional', () => {
    const result = listPetsSchema.safeParse({ ownerId: 'user-1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ownerId).toBe('user-1')
    }
  })

  it('omite ownerId quando ausente', () => {
    const result = listPetsSchema.safeParse({ page: 1, limit: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ownerId).toBeUndefined()
    }
  })

  it('coage page e limit de string para número', () => {
    const result = listPetsSchema.safeParse({ page: '2', limit: '5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(5)
    }
  })

  it('rejeita ownerId vazio', () => {
    expect(listPetsSchema.safeParse({ ownerId: '' }).success).toBe(false)
  })

  it('rejeita page < 1', () => {
    expect(listPetsSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('rejeita limit > 100', () => {
    expect(listPetsSchema.safeParse({ limit: 101 }).success).toBe(false)
  })
})
