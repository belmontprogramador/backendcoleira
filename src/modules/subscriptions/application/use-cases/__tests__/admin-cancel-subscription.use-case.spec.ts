import { AdminCancelSubscriptionUseCase } from '../admin-cancel-subscription.use-case'
import type { SubscriptionRepositoryPort } from '../../../domain/repositories/subscription.repository.port'
import type { UserAccessPort } from '../../../../../common/ports/user-access.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { HierarchyViolationError } from '../../../../../modules/users/application/errors'
import { SubscriptionNotFoundError } from '../../errors'
import { Subscription } from '../../../domain/entities/subscription.entity'

describe('AdminCancelSubscriptionUseCase', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let access: jest.Mocked<UserAccessPort>
  let audit: jest.Mocked<AuditLoggerPort>

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    access = { resolveAccess: jest.fn() }
    audit = { log: jest.fn() }
  })

  function makeActiveSubscription() {
    return Subscription.reconstitute({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
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

  function makeUseCase() {
    return new AdminCancelSubscriptionUseCase(subscriptions, access, audit)
  }

  it('cancela a assinatura de um alvo de role inferior e audita', async () => {
    const subscription = makeActiveSubscription()
    access.resolveAccess.mockResolvedValue({
      userId: 'user-1',
      roles: ['USER'],
      permissions: [],
    })
    subscriptions.findByUserId.mockResolvedValue(subscription)

    const result = await makeUseCase().execute(['ADMIN'], 'user-1')

    expect(result.status).toBe('CANCELLED')
    expect(result.cancelledAt).not.toBeNull()
    expect(subscriptions.save).toHaveBeenCalledWith(subscription)
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'subscription.cancelled_by_admin' }),
    )
  })

  it('permite cancelar alvo sem role (cliente não administrado)', async () => {
    const subscription = makeActiveSubscription()
    access.resolveAccess.mockResolvedValue({
      userId: 'user-1',
      roles: [],
      permissions: [],
    })
    subscriptions.findByUserId.mockResolvedValue(subscription)

    const result = await makeUseCase().execute(['ADMIN'], 'user-1')

    expect(result.status).toBe('CANCELLED')
  })

  it('lança HierarchyViolationError para alvo de role igual ou superior', async () => {
    access.resolveAccess.mockResolvedValue({
      userId: 'user-1',
      roles: ['ADMIN'],
      permissions: [],
    })

    await expect(makeUseCase().execute(['ADMIN'], 'user-1')).rejects.toThrow(
      HierarchyViolationError,
    )
    expect(subscriptions.findByUserId).not.toHaveBeenCalled()
  })

  it('lança SubscriptionNotFoundError quando o alvo não tem assinatura', async () => {
    access.resolveAccess.mockResolvedValue({
      userId: 'user-1',
      roles: ['USER'],
      permissions: [],
    })
    subscriptions.findByUserId.mockResolvedValue(null)

    await expect(makeUseCase().execute(['ADMIN'], 'user-1')).rejects.toThrow(
      SubscriptionNotFoundError,
    )
    expect(subscriptions.save).not.toHaveBeenCalled()
  })
})
