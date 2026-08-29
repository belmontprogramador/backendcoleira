import { SubscriptionMapper } from '../subscription.mapper'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { SubscriptionPeriod } from '../../../domain/value-objects/subscription-period.vo'
import type { SubscriptionModel } from '../../../../../generated/prisma/models/Subscription'

const start = new Date('2026-08-28T00:00:00.000Z')
const end = new Date('2026-09-28T00:00:00.000Z')

describe('SubscriptionMapper', () => {
  it('converte domínio → persistência (snake_case)', () => {
    const sub = Subscription.create({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      period: SubscriptionPeriod.create(start, end),
    })

    const data = SubscriptionMapper.toPersistence(sub)

    expect(data.id).toBe('sub-1')
    expect(data.user_id).toBe('user-1')
    expect(data.plan_id).toBe('plan-1')
    expect(data.provider).toBe('MERCADO_PAGO')
    expect(data.status).toBe('ACTIVE')
    expect(data.current_period_start).toBe(start)
    expect(data.current_period_end).toBe(end)
    expect(data.cancelled_at).toBeNull()
  })

  it('converte persistência → domínio', () => {
    const now = new Date('2026-08-28T00:00:00.000Z')
    const model = {
      id: 'sub-1',
      user_id: 'user-1',
      plan_id: 'plan-1',
      provider: 'MERCADO_PAGO',
      provider_customer_id: null,
      provider_subscription_id: null,
      status: 'CANCELLED',
      started_at: now,
      current_period_start: start,
      current_period_end: end,
      cancelled_at: now,
      created_at: now,
      updated_at: now,
    } as SubscriptionModel

    const sub = SubscriptionMapper.toDomain(model)

    expect(sub.id).toBe('sub-1')
    expect(sub.userId).toBe('user-1')
    expect(sub.planId).toBe('plan-1')
    expect(sub.status).toBe('CANCELLED')
    expect(sub.cancelledAt).toBe(now)
  })
})
