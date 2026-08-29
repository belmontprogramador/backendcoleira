import { addPlanInterval, nextPeriod } from '../subscription-billing'

describe('subscription-billing', () => {
  describe('addPlanInterval', () => {
    it('adiciona meses (MONTHLY)', () => {
      const from = new Date('2026-01-15T00:00:00.000Z')
      expect(addPlanInterval(from, 'MONTHLY', 1).toISOString()).toBe(
        '2026-02-15T00:00:00.000Z',
      )
    })

    it('adiciona anos (YEARLY)', () => {
      const from = new Date('2026-01-15T00:00:00.000Z')
      expect(addPlanInterval(from, 'YEARLY', 1).toISOString()).toBe(
        '2027-01-15T00:00:00.000Z',
      )
    })

    it('respeita intervalCount', () => {
      const from = new Date('2026-01-15T00:00:00.000Z')
      expect(addPlanInterval(from, 'MONTHLY', 3).toISOString()).toBe(
        '2026-04-15T00:00:00.000Z',
      )
    })
  })

  describe('nextPeriod', () => {
    it('começa em now quando não há período anterior', () => {
      const now = new Date('2026-01-15T00:00:00.000Z')
      const period = nextPeriod(now, null, 'MONTHLY', 1)
      expect(period.start.toISOString()).toBe(now.toISOString())
      expect(period.end.toISOString()).toBe('2026-02-15T00:00:00.000Z')
    })

    it('estende a partir do fim anterior (renovação)', () => {
      const now = new Date('2026-01-20T00:00:00.000Z')
      const previousEnd = new Date('2026-02-15T00:00:00.000Z')
      const period = nextPeriod(now, previousEnd, 'MONTHLY', 1)
      expect(period.start.toISOString()).toBe(previousEnd.toISOString())
      expect(period.end.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    })

    it('reinicia em now se o fim anterior já passou', () => {
      const now = new Date('2026-03-01T00:00:00.000Z')
      const previousEnd = new Date('2026-02-15T00:00:00.000Z')
      const period = nextPeriod(now, previousEnd, 'MONTHLY', 1)
      expect(period.start.toISOString()).toBe(now.toISOString())
      expect(period.end.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    })
  })
})
