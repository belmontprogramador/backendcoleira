import { DomainError } from '../errors/domain-error'

export const PRICE_CURRENCIES = ['BRL'] as const

export type PriceCurrency = (typeof PRICE_CURRENCIES)[number]

export class InvalidPriceError extends DomainError {
  constructor() {
    super('Preço deve ser um inteiro em centavos e não pode ser negativo', 400)
  }
}

/**
 * Value object de dinheiro, sempre em centavos (inteiro) para evitar
 * arredondamento de ponto flutuante (D10). Transversal: usado por `plans`
 * (preço do plano) e `subscriptions` (valor da transação).
 */
export class Price {
  private constructor(
    private readonly _amountInCents: number,
    private readonly _currency: PriceCurrency,
  ) {}

  static create(amountInCents: number, currency: PriceCurrency = 'BRL'): Price {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new InvalidPriceError()
    }
    return new Price(amountInCents, currency)
  }

  static zero(): Price {
    return new Price(0, 'BRL')
  }

  get amountInCents(): number {
    return this._amountInCents
  }

  get currency(): PriceCurrency {
    return this._currency
  }

  isZero(): boolean {
    return this._amountInCents === 0
  }
}
