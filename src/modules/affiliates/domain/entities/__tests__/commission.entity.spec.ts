import {
  Commission,
  InvalidCommissionError,
} from '../commission.entity'
import { CommissionConfig } from '../../value-objects/commission-config.vo'

describe('Commission', () => {
  const cfg = CommissionConfig.create({
    type: 'PERCENTAGE',
    fixedCents: 0,
    percentBps: 1000, // 10%
  })

  describe('create', () => {
    it('calcula amountCents a partir da config (snapshot)', () => {
      const c = Commission.create({
        id: 'com_1',
        affiliateId: 'aff_1',
        source: 'ORDER',
        orderId: 'ord_1',
        baseAmountCents: 1990,
        commission: cfg,
      })
      expect(c.amountCents).toBe(199)
      expect(c.status).toBe('AVAILABLE')
      expect(c.commissionType).toBe('PERCENTAGE')
      expect(c.percentBps).toBe(1000)
    })

    it('exige orderId para source ORDER', () => {
      expect(() =>
        Commission.create({
          id: 'com_1',
          affiliateId: 'aff_1',
          source: 'ORDER',
          baseAmountCents: 1990,
          commission: cfg,
        }),
      ).toThrow(InvalidCommissionError)
    })

    it('exige subscriptionId para source SUBSCRIPTION', () => {
      expect(() =>
        Commission.create({
          id: 'com_1',
          affiliateId: 'aff_1',
          source: 'SUBSCRIPTION',
          baseAmountCents: 1990,
          commission: cfg,
        }),
      ).toThrow(InvalidCommissionError)
    })

    it('cria comissão de assinatura com subscriptionId', () => {
      const c = Commission.create({
        id: 'com_2',
        affiliateId: 'aff_1',
        source: 'SUBSCRIPTION',
        subscriptionId: 'sub_1',
        baseAmountCents: 4900,
        commission: cfg,
      })
      expect(c.subscriptionId).toBe('sub_1')
      expect(c.orderId).toBeNull()
      expect(c.amountCents).toBe(490)
    })
  })

  describe('cancel', () => {
    it('transiciona AVAILABLE → CANCELLED e é idempotente', () => {
      const c = Commission.create({
        id: 'com_1',
        affiliateId: 'aff_1',
        source: 'ORDER',
        orderId: 'ord_1',
        baseAmountCents: 1990,
        commission: cfg,
      })
      c.cancel()
      expect(c.status).toBe('CANCELLED')
      expect(c.isAvailable()).toBe(false)
      c.cancel()
      expect(c.status).toBe('CANCELLED')
    })
  })
})
