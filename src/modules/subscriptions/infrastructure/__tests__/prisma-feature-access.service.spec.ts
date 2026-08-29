import { PrismaFeatureAccessService } from '../prisma-feature-access.service'
import type { SubscriptionRepositoryPort } from '../../domain/repositories/subscription.repository.port'
import type { FeatureRepositoryPort } from '../../../plans/domain/repositories/feature.repository.port'
import { Subscription } from '../../domain/entities/subscription.entity'
import { SubscriptionPeriod } from '../../domain/value-objects/subscription-period.vo'
import { Feature } from '../../../plans/domain/entities/feature.entity'

const start = new Date('2026-08-28T00:00:00.000Z')
const end = new Date('2026-09-28T00:00:00.000Z')

function makeActiveSubscription(): Subscription {
  return Subscription.create({
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-2',
    period: SubscriptionPeriod.create(start, end),
  })
}

function makeFeature(id: string, code: string): Feature {
  return Feature.create({ id, code, name: code })
}

describe('PrismaFeatureAccessService', () => {
  let subscriptions: jest.Mocked<SubscriptionRepositoryPort>
  let features: jest.Mocked<FeatureRepositoryPort>
  let service: PrismaFeatureAccessService

  beforeEach(() => {
    subscriptions = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
    }
    features = { findByCode: jest.fn(), findByPlanId: jest.fn() }
    service = new PrismaFeatureAccessService(subscriptions, features)
  })

  it('hasFeature true para assinante Premium com a feature', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(makeActiveSubscription())
    features.findByPlanId.mockResolvedValue([
      makeFeature('feat-1', 'PET_MEDICAL'),
    ])

    await expect(service.hasFeature('user-1', 'PET_MEDICAL')).resolves.toBe(
      true,
    )
  })

  it('hasFeature false sem assinatura ativa', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(null)

    await expect(service.hasFeature('user-1', 'PET_MEDICAL')).resolves.toBe(
      false,
    )
    expect(features.findByPlanId).not.toHaveBeenCalled()
  })

  it('hasFeature false quando o plano não inclui a feature', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(makeActiveSubscription())
    features.findByPlanId.mockResolvedValue([])

    await expect(service.hasFeature('user-1', 'PET_MEDICAL')).resolves.toBe(
      false,
    )
  })

  it('listFeatures retorna os codes das features do plano ativo', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(makeActiveSubscription())
    features.findByPlanId.mockResolvedValue([
      makeFeature('feat-1', 'PET_MEDICAL'),
      makeFeature('feat-2', 'ACCESS_HISTORY'),
    ])

    await expect(service.listFeatures('user-1')).resolves.toEqual([
      'PET_MEDICAL',
      'ACCESS_HISTORY',
    ])
  })

  it('listFeatures retorna vazio sem assinatura ativa', async () => {
    subscriptions.findActiveByUserId.mockResolvedValue(null)

    await expect(service.listFeatures('user-1')).resolves.toEqual([])
  })
})
