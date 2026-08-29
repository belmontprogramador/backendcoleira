import { listContactsSchema } from '../list-contacts.schema'

describe('listContactsSchema', () => {
  it('aplica defaults page=1 e limit=20', () => {
    const result = listContactsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ page: 1, limit: 20 })
    }
  })

  it('aceita petId opcional', () => {
    const result = listContactsSchema.safeParse({ petId: 'pet-1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.petId).toBe('pet-1')
    }
  })

  it('coage page e limit de string para número', () => {
    const result = listContactsSchema.safeParse({ page: '2', limit: '5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(5)
    }
  })

  it('rejeita page < 1', () => {
    expect(listContactsSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('rejeita limit > 100', () => {
    expect(listContactsSchema.safeParse({ limit: 101 }).success).toBe(false)
  })
})
