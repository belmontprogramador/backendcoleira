import type { Price } from '../../../../common/value-objects/price.vo'
import type { PlanInterval } from '../value-objects/plan-interval.vo'
import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidPlanIntervalCountError extends DomainError {
  constructor() {
    super('Quantidade de intervalos do plano deve ser >= 1', 400)
  }
}

export class InvalidPlanError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreatePlanProps {
  id: string
  code: string
  name: string
  description?: string | null
  price: Price
  interval?: PlanInterval
  intervalCount?: number
  isDefault?: boolean
}

export interface ReconstructPlanProps {
  id: string
  code: string
  name: string
  description: string | null
  price: Price
  interval: PlanInterval
  intervalCount: number
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Plan` — catálogo de planos (Basic/Premium) do Feature System.
 * Invariantes: `code`/`name` não vazios, `price >= 0` (via `Price`),
 * `intervalCount >= 1`.
 */
export class Plan {
  private constructor(
    private readonly _id: string,
    private readonly _code: string,
    private readonly _name: string,
    private readonly _description: string | null,
    private readonly _price: Price,
    private readonly _interval: PlanInterval,
    private readonly _intervalCount: number,
    private readonly _isDefault: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {}

  static create(props: CreatePlanProps): Plan {
    const code = props.code.trim()
    const name = props.name.trim()
    if (code.length === 0 || name.length === 0) {
      throw new InvalidPlanError('Código e nome do plano são obrigatórios')
    }
    const intervalCount = props.intervalCount ?? 1
    if (intervalCount < 1) {
      throw new InvalidPlanIntervalCountError()
    }
    const now = new Date()
    return new Plan(
      props.id,
      code,
      name,
      props.description ?? null,
      props.price,
      props.interval ?? 'MONTHLY',
      intervalCount,
      props.isDefault ?? false,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructPlanProps): Plan {
    return new Plan(
      props.id,
      props.code,
      props.name,
      props.description,
      props.price,
      props.interval,
      props.intervalCount,
      props.isDefault,
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
  get price(): Price {
    return this._price
  }
  get interval(): PlanInterval {
    return this._interval
  }
  get intervalCount(): number {
    return this._intervalCount
  }
  get isDefault(): boolean {
    return this._isDefault
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
