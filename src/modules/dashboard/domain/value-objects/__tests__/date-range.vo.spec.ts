import {
  DateRange,
  InvalidDateRangeError,
  MAX_RANGE_DAYS,
} from '../date-range.vo'

describe('DateRange (value object)', () => {
  it('cria com datas válidas', () => {
    const range = DateRange.create(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
    )
    expect(range.from).toEqual(new Date('2026-08-01T00:00:00.000Z'))
    expect(range.to).toEqual(new Date('2026-08-31T00:00:00.000Z'))
  })

  it('lança quando from > to', () => {
    expect(() =>
      DateRange.create(
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
      ),
    ).toThrow(InvalidDateRangeError)
  })

  it('lança quando período excede o teto', () => {
    expect(() =>
      DateRange.create(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2027-02-01T00:00:00.000Z'),
      ),
    ).toThrow(InvalidDateRangeError)
  })

  it('lança com data inválida (NaN)', () => {
    expect(() =>
      DateRange.create(
        new Date('invalid'),
        new Date('2026-08-31T00:00:00.000Z'),
      ),
    ).toThrow(InvalidDateRangeError)
  })

  it('lastDays cria o intervalo padrão de 30 dias', () => {
    const now = new Date('2026-09-01T12:00:00.000Z')
    const range = DateRange.lastDays(30, now)
    expect(range.to).toEqual(now)
    expect(range.from.getTime()).toBe(now.getTime() - 30 * 86_400_000)
  })

  it('days calcula a diferença em dias', () => {
    const range = DateRange.create(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-11T00:00:00.000Z'),
    )
    expect(range.days).toBe(10)
  })

  it('aceita o teto exato (MAX_RANGE_DAYS)', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const to = new Date(from.getTime() + MAX_RANGE_DAYS * 86_400_000)
    expect(() => DateRange.create(from, to)).not.toThrow()
  })
})
