import { Feature } from '../../domain/entities/feature.entity'
import type { FeatureModel } from '../../../../generated/prisma/models/Feature'

/**
 * Converte a entidade `Feature` (domínio) para o formato de persistência
 * Prisma (snake_case) e vice-versa.
 */
export class FeatureMapper {
  static toPersistence(feature: Feature): {
    id: string
    code: string
    name: string
    description: string | null
    created_at: Date
    updated_at: Date
  } {
    return {
      id: feature.id,
      code: feature.code,
      name: feature.name,
      description: feature.description,
      created_at: feature.createdAt,
      updated_at: feature.updatedAt,
    }
  }

  static toDomain(model: FeatureModel): Feature {
    return Feature.reconstitute({
      id: model.id,
      code: model.code,
      name: model.name,
      description: model.description,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    })
  }
}
