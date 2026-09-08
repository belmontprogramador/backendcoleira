import { Affiliate, InvalidAffiliateError } from '../affiliate.entity'
import { CommissionConfig } from '../../value-objects/commission-config.vo'

describe('Affiliate', () => {
  const base = {
    id: 'aff_1',
    code: 'ana123',
    name: 'Ana Souza',
    email: 'ana@example.com',
  }

  describe('create', () => {
    it('cria afiliado ACTIVE com config padrão', () => {
      const a = Affiliate.create(base)
      expect(a.id).toBe('aff_1')
      expect(a.code).toBe('ana123')
      expect(a.status).toBe('ACTIVE')
      expect(a.minWithdrawalCents).toBe(0)
      expect(a.commission.type).toBe('PERCENTAGE')
      expect(a.commission.percentBps).toBe(0)
      expect(a.userId).toBeNull()
    })

    it('normaliza code para minúsculo', () => {
      const a = Affiliate.create({ ...base, code: ' Ana-99 ' })
      expect(a.code).toBe('ana-99')
      const b = Affiliate.create({ ...base, code: 'ANA-99' })
      expect(b.code).toBe('ana-99')
    })

    it('rejeita code inválido (caracteres especiais / curto)', () => {
      expect(() => Affiliate.create({ ...base, code: 'ab' })).toThrow(
        InvalidAffiliateError,
      )
      expect(() => Affiliate.create({ ...base, code: 'ana_123' })).toThrow(
        InvalidAffiliateError,
      )
      expect(() => Affiliate.create({ ...base, code: 'ana 123' })).toThrow(
        InvalidAffiliateError,
      )
    })

    it('rejeita nome vazio', () => {
      expect(() => Affiliate.create({ ...base, name: '   ' })).toThrow(
        InvalidAffiliateError,
      )
    })

    it('rejeita email vazio', () => {
      expect(() => Affiliate.create({ ...base, email: ' ' })).toThrow(
        InvalidAffiliateError,
      )
    })

    it('rejeita minWithdrawalCents negativo', () => {
      expect(() =>
        Affiliate.create({ ...base, minWithdrawalCents: -1 }),
      ).toThrow(InvalidAffiliateError)
    })
  })

  describe('comportamento', () => {
    it('linkUser associa o User', () => {
      const a = Affiliate.create(base)
      a.linkUser('user_1')
      expect(a.userId).toBe('user_1')
    })

    it('deactivate/activate alternam o status', () => {
      const a = Affiliate.create(base)
      a.deactivate()
      expect(a.status).toBe('INACTIVE')
      expect(a.isActive()).toBe(false)
      a.activate()
      expect(a.status).toBe('ACTIVE')
      expect(a.isActive()).toBe(true)
    })

    it('changeCommission substitui a config', () => {
      const a = Affiliate.create(base)
      const cfg = CommissionConfig.create({
        type: 'FIXED',
        fixedCents: 999,
        percentBps: 0,
      })
      a.changeCommission(cfg)
      expect(a.commission.equals(cfg)).toBe(true)
    })

    it('changeMinWithdrawal rejeita negativo', () => {
      const a = Affiliate.create(base)
      expect(() => a.changeMinWithdrawal(-1)).toThrow(InvalidAffiliateError)
      a.changeMinWithdrawal(2000)
      expect(a.minWithdrawalCents).toBe(2000)
    })

    it('updateDetails atualiza dados editáveis e preserva code', () => {
      const a = Affiliate.create(base)
      a.updateDetails({ name: 'Ana B.', pixKey: 'ana@pix', bankName: 'Nubank' })
      expect(a.name).toBe('Ana B.')
      expect(a.pixKey).toBe('ana@pix')
      expect(a.bankName).toBe('Nubank')
      expect(a.code).toBe('ana123')
    })
  })
})
