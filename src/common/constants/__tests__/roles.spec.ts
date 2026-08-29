import { canManage, highestRank, roleRank, Role } from '../roles'

describe('roles (hierarquia)', () => {
  it('roleRank mapeia corretamente', () => {
    expect(roleRank(Role.USER)).toBe(0)
    expect(roleRank(Role.SUPER_ADMIN)).toBe(4)
    expect(roleRank('DESCONHECIDA')).toBe(-1)
  })

  it('highestRank retorna a maior role', () => {
    expect(highestRank([Role.USER, Role.ADMIN])).toBe(3)
    expect(highestRank([])).toBe(-1)
  })

  it('ADMIN pode gerenciar USER/SUPPORT/OPERATOR', () => {
    expect(canManage([Role.ADMIN], [Role.USER])).toBe(true)
    expect(canManage([Role.ADMIN], [Role.OPERATOR])).toBe(true)
  })

  it('ADMIN NÃO pode gerenciar outro ADMIN', () => {
    expect(canManage([Role.ADMIN], [Role.ADMIN])).toBe(false)
  })

  it('ADMIN NÃO pode gerenciar SUPER_ADMIN', () => {
    expect(canManage([Role.ADMIN], [Role.SUPER_ADMIN])).toBe(false)
  })

  it('SUPER_ADMIN gerencia ADMIN e abaixo', () => {
    expect(canManage([Role.SUPER_ADMIN], [Role.ADMIN])).toBe(true)
    expect(canManage([Role.SUPER_ADMIN], [Role.USER])).toBe(true)
  })

  it('SUPER_ADMIN NÃO gerencia outro SUPER_ADMIN', () => {
    expect(canManage([Role.SUPER_ADMIN], [Role.SUPER_ADMIN])).toBe(false)
  })
})
