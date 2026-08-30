import { AdminSubscriptionResponseAssembler } from '../admin-subscription-response.assembler'
import type { SubscriptionOwnerInfoPort } from '../../../domain/repositories/subscription-owner-info.port'
import type { PlanRepositoryPort } from '../../../../plans/domain/repositories/plan.repository.port'
import { Subscription } from '../../../domain/entities/subscription.entity'
import { Plan } from '../../../../plans/domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminSubscriptionResponseAssembler', () => {
  let owners: jest.Mocked<SubscriptionOwnerInfoPort>
  let plans: jest.Mocked<PlanRepositoryPort>

  beforeEach(() => {
    owners = { findByIds: jest.fn() }
    plans = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCode: jest.fn(),
      findDefault: jest.fn(),
    }
  })

  function makeSubscription(id: string, userId: string, planId: string) {
    return Subscription.reconstitute({
      id,
      userId,
      planId,
      provider: 'MERCADO_PAGO',
      providerCustomerId: null,
      providerSubscriptionId: null,
      status: 'ACTIVE',
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  }

  it('resolve donos e planos em lote (sem N+1) e monta as respostas', async () => {
    const subs = [
      makeSubscription('sub-1', 'user-1', 'plan-1'),
      makeSubscription('sub-2', 'user-2', 'plan-2'),
    ]
    owners.findByIds.mockResolvedValue([
      { id: 'user-1', name: 'A', email: 'a@email.com' },
      { id: 'user-2', name: 'B', email: 'b@email.com' },
    ])
    plans.findByIds.mockResolvedValue([
      Plan.create({
        id: 'plan-1',
        code: 'PREMIUM',
        name: 'Premium',
        price: Price.create(1990),
      }),
      Plan.create({
        id: 'plan-2',
        code: 'BASIC',
        name: 'Basic',
        price: Price.create(0),
        isDefault: true,
      }),
    ])

    const result = await new AdminSubscriptionResponseAssembler(
      owners,
      plans,
    ).toResponses(subs)

    expect(result).toHaveLength(2)
    expect(result[0].owner?.email).toBe('a@email.com')
    expect(result[0].plan?.code).toBe('PREMIUM')
    expect(result[1].owner?.email).toBe('b@email.com')
    expect(result[1].plan?.code).toBe('BASIC')

    // batch: uma única chamada por porta, com ids deduplicados.
    expect(owners.findByIds).toHaveBeenCalledTimes(1)
    expect(owners.findByIds).toHaveBeenCalledWith(['user-1', 'user-2'])
    expect(plans.findByIds).toHaveBeenCalledTimes(1)
    expect(plans.findByIds).toHaveBeenCalledWith(['plan-1', 'plan-2'])
  })

  it('retorna owner/plan nulos para ids não resolvidos', async () => {
    const subs = [makeSubscription('sub-1', 'user-1', 'plan-1')]
    owners.findByIds.mockResolvedValue([])
    plans.findByIds.mockResolvedValue([])

    const result = await new AdminSubscriptionResponseAssembler(
      owners,
      plans,
    ).toResponses(subs)

    expect(result[0].owner).toBeNull()
    expect(result[0].plan).toBeNull()
  })

  it('retorna array vazio sem assinaturas', async () => {
    owners.findByIds.mockResolvedValue([])
    plans.findByIds.mockResolvedValue([])

    const result = await new AdminSubscriptionResponseAssembler(
      owners,
      plans,
    ).toResponses([])

    expect(result).toEqual([])
  })
})
