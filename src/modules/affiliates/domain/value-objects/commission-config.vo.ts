import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidCommissionConfigError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export const COMMISSION_TYPE_VALUES = [
  'FIXED',
  'PERCENTAGE',
  'FIXED_PLUS_PERCENTAGE',
] as const

export type CommissionType = (typeof COMMISSION_TYPE_VALUES)[number]

export function isCommissionType(value: string): value is CommissionType {
  return (COMMISSION_TYPE_VALUES as readonly string[]).includes(value)
}

export interface CommissionConfigProps {
  type: CommissionType
  /** Valor fixo em centavos (usado em FIXED e FIXED_PLUS_PERCENTAGE). */
  fixedCents: number
  /** Percentual em basis points (1% = 100 bps). */
  percentBps: number
}

/**
 * Value object imutável que centraliza o cálculo da comissão
 * (fixa / percentual / fixa+percentual).
 *
 * Percentual em basis points (bps) evita arredondamento de ponto flutuante.
 * O cálculo usa `Math.round` no resultado final (centavos inteiros).
 */
export class CommissionConfig {
  private constructor(
    private readonly _type: CommissionType,
    private readonly _fixedCents: number,
    private readonly _percentBps: number,
  ) {}

  static create(props: CommissionConfigProps): CommissionConfig {
    if (!Number.isInteger(props.fixedCents) || props.fixedCents < 0) {
      throw new InvalidCommissionConfigError(
        'Comissão fixa deve ser um inteiro não-negativo (centavos)',
      )
    }
    if (!Number.isInteger(props.percentBps) || props.percentBps < 0) {
      throw new InvalidCommissionConfigError(
        'Percentual (bps) deve ser um inteiro não-negativo',
      )
    }
    return new CommissionConfig(props.type, props.fixedCents, props.percentBps)
  }

  /**
   * Calcula a comissão sobre uma base em centavos (valor do produto/sem frete,
   * ou preço do plano).
   */
  calculate(baseCents: number): number {
    if (!Number.isInteger(baseCents) || baseCents < 0) {
      throw new InvalidCommissionConfigError(
        'Base da comissão deve ser um inteiro não-negativo (centavos)',
      )
    }

    switch (this._type) {
      case 'FIXED':
        return this._fixedCents
      case 'PERCENTAGE':
        return Math.round((baseCents * this._percentBps) / 10000)
      case 'FIXED_PLUS_PERCENTAGE':
        return (
          this._fixedCents + Math.round((baseCents * this._percentBps) / 10000)
        )
    }
  }

  get type(): CommissionType {
    return this._type
  }
  get fixedCents(): number {
    return this._fixedCents
  }
  get percentBps(): number {
    return this._percentBps
  }

  equals(other: CommissionConfig): boolean {
    return (
      other.type === this._type &&
      other.fixedCents === this._fixedCents &&
      other.percentBps === this._percentBps
    )
  }
}
