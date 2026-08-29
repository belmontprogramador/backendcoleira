import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidSubscriptionPeriodError extends DomainError {
  constructor() {
    super('Período da assinatura deve ter início antes do fim', 400)
  }
}

/**
 * Value object para o período de vigência de uma assinatura.
 * Invariante: `start < end`.
 */
export class SubscriptionPeriod {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date,
  ) {}

  static create(start: Date, end: Date): SubscriptionPeriod {
    if (start.getTime() >= end.getTime()) {
      throw new InvalidSubscriptionPeriodError()
    }
    return new SubscriptionPeriod(start, end)
  }

  get start(): Date {
    return this._start
  }

  get end(): Date {
    return this._end
  }

  /** `true` se `now` está dentro de `[start, end)`. */
  contains(now: Date): boolean {
    return (
      now.getTime() >= this._start.getTime() &&
      now.getTime() < this._end.getTime()
    )
  }
}
