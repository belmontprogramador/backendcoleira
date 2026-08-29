import { Feature, InvalidFeatureError } from '../feature.entity'

describe('Feature (entidade)', () => {
  it('cria uma feature', () => {
    const feature = Feature.create({
      id: 'feat-1',
      code: 'PET_MEDICAL',
      name: 'Dados médicos',
      description: 'Ficha veterinária do pet',
    })

    expect(feature.id).toBe('feat-1')
    expect(feature.code).toBe('PET_MEDICAL')
    expect(feature.name).toBe('Dados médicos')
    expect(feature.description).toBe('Ficha veterinária do pet')
  })

  it('rejeita code vazio', () => {
    expect(() =>
      Feature.create({ id: 'feat-1', code: '   ', name: 'X' }),
    ).toThrow(InvalidFeatureError)
  })

  it('rejeita name vazio', () => {
    expect(() =>
      Feature.create({ id: 'feat-1', code: 'PET_MEDICAL', name: '  ' }),
    ).toThrow(InvalidFeatureError)
  })

  it('reconstitui uma feature persistida', () => {
    const now = new Date()
    const feature = Feature.reconstitute({
      id: 'feat-1',
      code: 'ACCESS_HISTORY',
      name: 'Histórico de acessos',
      description: null,
      createdAt: now,
      updatedAt: now,
    })

    expect(feature.code).toBe('ACCESS_HISTORY')
    expect(feature.description).toBeNull()
  })
})
