import { FeatureMapper } from '../feature.mapper'
import { Feature } from '../../../domain/entities/feature.entity'
import type { FeatureModel } from '../../../../../generated/prisma/models/Feature'

describe('FeatureMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const feature = Feature.create({
      id: 'feat-1',
      code: 'PET_MEDICAL',
      name: 'Dados médicos',
    })

    const data = FeatureMapper.toPersistence(feature)

    expect(data.id).toBe('feat-1')
    expect(data.code).toBe('PET_MEDICAL')
    expect(data.name).toBe('Dados médicos')
    expect(data.description).toBeNull()
  })

  it('converte persistência → domínio', () => {
    const model = {
      id: 'feat-1',
      code: 'ACCESS_HISTORY',
      name: 'Histórico de acessos',
      description: 'Histórico de acessos do pet',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    } as FeatureModel

    const feature = FeatureMapper.toDomain(model)

    expect(feature.id).toBe('feat-1')
    expect(feature.code).toBe('ACCESS_HISTORY')
    expect(feature.name).toBe('Histórico de acessos')
    expect(feature.description).toBe('Histórico de acessos do pet')
  })
})
