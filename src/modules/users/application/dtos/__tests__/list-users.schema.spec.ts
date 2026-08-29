import { listUsersSchema } from '../list-users.schema'

describe('listUsersSchema', () => {
  it('aplica defaults page=1 e limit=20', () => {
    const result = listUsersSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ page: 1, limit: 20 })
    }
  })

  it('coage page e limit de string para número', () => {
    const result = listUsersSchema.safeParse({ page: '2', limit: '5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(5)
    }
  })

  it('rejeita page < 1', () => {
    expect(listUsersSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('rejeita limit > 100', () => {
    expect(listUsersSchema.safeParse({ limit: 101 }).success).toBe(false)
  })

  it('aceita status válido', () => {
    const result = listUsersSchema.safeParse({ status: 'ACTIVE' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE')
    }
  })

  it('rejeita status inválido', () => {
    expect(listUsersSchema.safeParse({ status: 'BANANA' }).success).toBe(false)
  })

  it('normaliza role único (trim + uppercase)', () => {
    const result = listUsersSchema.safeParse({ role: ' admin ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toEqual(['ADMIN'])
    }
  })

  it('aceita role CSV e normaliza cada token', () => {
    const result = listUsersSchema.safeParse({
      role: 'operator, admin, super_admin',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toEqual(['OPERATOR', 'ADMIN', 'SUPER_ADMIN'])
    }
  })

  it('aceita NONE (usuários sem role)', () => {
    const result = listUsersSchema.safeParse({ role: 'NONE' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toEqual(['NONE'])
    }
  })

  it('aceita mistura de role nomeada + NONE (clientes = USER + sem role)', () => {
    const result = listUsersSchema.safeParse({ role: 'USER,NONE' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toEqual(['USER', 'NONE'])
    }
  })

  it('rejeita role desconhecida', () => {
    expect(listUsersSchema.safeParse({ role: 'DEUS' }).success).toBe(false)
  })

  it('role ausente vira undefined (sem filtro)', () => {
    const result = listUsersSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBeUndefined()
    }
  })
})
