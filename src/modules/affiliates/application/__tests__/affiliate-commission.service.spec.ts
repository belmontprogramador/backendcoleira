import { AffiliateCommissionService } from '../affiliate-commission.service'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import type { CommissionRepositoryPort } from '../../domain/repositories/commission.repository.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { Affiliate } from '../../domain/entities/affiliate.entity'
import { Commission } from '../../domain/entities/commission.entity'
import { CommissionConfig } from '../../domain/value-objects/commission-config.vo'

describe('AffiliateCommissionService', () => {
  let affiliates: jest.Mocked<AffiliateRepositoryPort>
  let commissions: jest.Mocked<CommissionRepositoryPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let service: AffiliateCommissionService

  beforeEach(() => {
    affiliates = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByCode: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    commissions = {
      save: jest.fn(),
      findByOrderId: jest.fn(),
      findBySubscriptionId: jest.fn(),
      sumAvailableByAffiliateId: jest.fn(),
      aggregateByAffiliateId: jest.fn(),
    }
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditLoggerPort>
    service = new AffiliateCommissionService(affiliates, commissions, audit)
  })

  const affiliate = Affiliate.create({
    id: 'aff-1',
    code: 'ana123',
    name: 'Ana',
    email: 'ana@example.com',
    commission: CommissionConfig.create({
      type: 'PERCENTAGE',
      fixedCents: 0,
      percentBps: 1000, // 10%
    }),
  })

  it('attributeOrder cria comissão com config snapshot', async () => {
    affiliates.findByCode.mockResolvedValue(affiliate)
    commissions.save.mockImplementation(async c => c)

    await service.attributeOrder({
      orderId: 'ord-1',
      referralCode: 'ANA123',
      baseAmountCents: 1990,
    })

    expect(affiliates.findByCode).toHaveBeenCalledWith('ana123')
    expect(commissions.save).toHaveBeenCalled()
    const saved = commissions.save.mock.calls[0][0] as Commission
    expect(saved.amountCents).toBe(199)
    expect(saved.source).toBe('ORDER')
  })

  it('attributeOrder não faz nada sem referralCode', async () => {
    await service.attributeOrder({
      orderId: 'ord-1',
      referralCode: null,
      baseAmountCents: 1990,
    })
    expect(affiliates.findByCode).not.toHaveBeenCalled()
    expect(commissions.save).not.toHaveBeenCalled()
  })

  it('attributeOrder não faz nada para afiliado inativo', async () => {
    const inactive = Affiliate.create({
      id: 'aff-2',
      code: 'bia456',
      name: 'Bia',
      email: 'bia@example.com',
    })
    inactive.deactivate()
    affiliates.findByCode.mockResolvedValue(inactive)

    await service.attributeOrder({
      orderId: 'ord-1',
      referralCode: 'bia456',
      baseAmountCents: 1990,
    })
    expect(commissions.save).not.toHaveBeenCalled()
  })

  it('revokeOrder cancela comissão disponível', async () => {
    const commission = Commission.create({
      id: 'com-1',
      affiliateId: 'aff-1',
      source: 'ORDER',
      orderId: 'ord-1',
      baseAmountCents: 1990,
      commission: affiliate.commission,
    })
    commissions.findByOrderId.mockResolvedValue(commission)
    commissions.save.mockImplementation(async c => c)

    await service.revokeOrder('ord-1')

    expect(commission.status).toBe('CANCELLED')
    expect(commissions.save).toHaveBeenCalled()
  })
})
