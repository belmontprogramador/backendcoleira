import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidFeatureError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreateFeatureProps {
  id: string
  code: string
  name: string
  description?: string | null
}

export interface ReconstructFeatureProps {
  id: string
  code: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Feature` — funcionalidade gateável por plano (Feature System).
 * Invariante: `code` e `name` não vazios.
 */
export class Feature {
  private constructor(
    private readonly _id: string,
    private readonly _code: string,
    private readonly _name: string,
    private readonly _description: string | null,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {}

  static create(props: CreateFeatureProps): Feature {
    const code = props.code.trim()
    const name = props.name.trim()
    if (code.length === 0) {
      throw new InvalidFeatureError('Código da feature é obrigatório')
    }
    if (name.length === 0) {
      throw new InvalidFeatureError('Nome da feature é obrigatório')
    }
    const now = new Date()
    return new Feature(
      props.id,
      code,
      name,
      props.description ?? null,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructFeatureProps): Feature {
    return new Feature(
      props.id,
      props.code,
      props.name,
      props.description,
      props.createdAt,
      props.updatedAt,
    )
  }

  get id(): string {
    return this._id
  }
  get code(): string {
    return this._code
  }
  get name(): string {
    return this._name
  }
  get description(): string | null {
    return this._description
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
