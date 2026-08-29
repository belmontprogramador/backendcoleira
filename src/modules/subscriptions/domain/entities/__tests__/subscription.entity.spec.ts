import { Subscription } from '../subscription.entity'
import { SubscriptionPeriod } from '../../value-objects/subscription-period.vo'

const start = new Date('2026-08-28T00:00:00Z')
const end = new Date('2026-09-28T00:00:00Z')

describe('Subscription (entidade)', () => {
  it('cria uma assinatura ACTIVE com período válido', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    expect(sub.id).toBe('sub-1')
    expect(sub.userId).toBe('user-1')
    expect(sub.planId).toBe('plan-1')
    expect(sub.status).toBe('ACTIVE')
    expect(sub.provider).toBe('MERCADO_PAGO')
    expect(sub.currentPeriodStart).toBe(start)
    expect(sub.currentPeriodEnd).toBe(end)
    expect(sub.cancelledAt).toBeNull()
  })

  it('cancela e preserva a data da primeira vez (idempotente)', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    sub.cancel()
    const cancelledAt = sub.cancelledAt
    expect(sub.status).toBe('CANCELLED')
    expect(cancelledAt).not.toBeNull()

    sub.cancel()
    expect(sub.cancelledAt).toBe(cancelledAt)
  })

  it('expira lazy quando o período termina e o status é ACTIVE', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    sub.expireIfDue(new Date('2026-09-29T00:00:00Z'))
    expect(sub.status).toBe('EXPIRED')
  })

  it('não expira se ainda está no período', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    sub.expireIfDue(new Date('2026-09-01T00:00:00Z'))
    expect(sub.status).toBe('ACTIVE')
  })

  it('não expira uma assinatura já cancelada', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    sub.cancel()
    sub.expireIfDue(new Date('2026-09-29T00:00:00Z'))
    expect(sub.status).toBe('CANCELLED')
  })

  it('renova: atualiza o período e volta a ACTIVE', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })
    sub.cancel()

    const newStart = new Date('2026-10-01T00:00:00Z')
    const newEnd = new Date('2026-11-01T00:00:00Z')
    sub.renew(SubscriptionPeriod.create(newStart, newEnd))

    expect(sub.status).toBe('ACTIVE')
    expect(sub.currentPeriodStart).toBe(newStart)
    expect(sub.currentPeriodEnd).toBe(newEnd)
    expect(sub.cancelledAt).toBeNull()
  })

  it('isActive: true para ACTIVE com período válido, false após o fim', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    expect(sub.isActive(new Date('2026-09-01T00:00:00Z'))).toBe(true)
    expect(sub.isActive(new Date('2026-09-29T00:00:00Z'))).toBe(false)
  })

  it('reconstitui uma assinatura persistida', () => {
    const now = new Date()
    const sub = Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'PAST_DUE',
      startedAt: now,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    })

    expect(sub.status).toBe('PAST_DUE')
    expect(sub.currentPeriodStart).toBe(start)
  })
})
