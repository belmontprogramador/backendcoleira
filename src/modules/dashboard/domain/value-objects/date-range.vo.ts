import { DomainError } from '../../../../common/errors/domain-error'

export const DEFAULT_RANGE_DAYS = 30
export const MAX_RANGE_DAYS = 366

export const DAY_MS = 86_400_000

export class InvalidDateRangeError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

/**
 * Value object de intervalo de datas para métricas/dashboard.
 *
 * - `from <= to` (obrigatório).
 * - Teto de `MAX_RANGE_DAYS` dias (evita agregação pesada).
 * - Não normaliza para bordas de dia — preserva os instantes informados.
 */
export class DateRange {
  private constructor(
    private readonly _from: Date,
    private readonly _to: Date,
  ) {}

  static create(from: Date, to: Date): DateRange {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new InvalidDateRangeError('from/to devem ser datas válidas')
    }
    if (from.getTime() > to.getTime()) {
      throw new InvalidDateRangeError('from não pode ser posterior a to')
    }
    const days = Math.ceil((to.getTime() - from.getTime()) / DAY_MS)
    if (days > MAX_RANGE_DAYS) {
      throw new InvalidDateRangeError(
        `período máximo é de ${MAX_RANGE_DAYS} dias`,
      )
    }
    return new DateRange(from, to)
  }

  static lastDays(
    days: number = DEFAULT_RANGE_DAYS,
    now: Date = new Date(),
  ): DateRange {
    return DateRange.create(new Date(now.getTime() - days * DAY_MS), now)
  }

  get from(): Date {
    return this._from
  }

  get to(): Date {
    return this._to
  }

  get days(): number {
    return Math.ceil((this._to.getTime() - this._from.getTime()) / DAY_MS)
  }
}
