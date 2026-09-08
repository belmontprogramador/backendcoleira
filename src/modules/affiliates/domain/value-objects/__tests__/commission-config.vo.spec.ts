import {
  CommissionConfig,
  InvalidCommissionConfigError,
} from '../commission-config.vo'

describe('CommissionConfig', () => {
  describe('create', () => {
    it('aceita config válida FIXED', () => {
      const cfg = CommissionConfig.create({
        type: 'FIXED',
        fixedCents: 500,
        percentBps: 0,
      })
      expect(cfg.type).toBe('FIXED')
      expect(cfg.fixedCents).toBe(500)
      expect(cfg.percentBps).toBe(0)
    })

    it('rejeita fixedCents negativo', () => {
      expect(() =>
        CommissionConfig.create({
          type: 'FIXED',
          fixedCents: -1,
          percentBps: 0,
        }),
      ).toThrow(InvalidCommissionConfigError)
    })

    it('rejeita percentBps negativo', () => {
      expect(() =>
        CommissionConfig.create({
          type: 'PERCENTAGE',
          fixedCents: 0,
          percentBps: -1,
        }),
      ).toThrow(InvalidCommissionConfigError)
    })

    it('rejeita fixedCents não inteiro', () => {
      expect(() =>
        CommissionConfig.create({
          type: 'FIXED',
          fixedCents: 1.5,
          percentBps: 0,
        }),
      ).toThrow(InvalidCommissionConfigError)
    })
  })

  describe('calculate', () => {
    it('FIXED ignora a base e retorna o fixo', () => {
      const cfg = CommissionConfig.create({
        type: 'FIXED',
        fixedCents: 700,
        percentBps: 0,
      })
      expect(cfg.calculate(1990)).toBe(700)
      expect(cfg.calculate(0)).toBe(700)
    })

    it('PERCENTAGE calcula base * bps / 10000 arredondado', () => {
      const cfg = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 1000, // 10%
      })
      expect(cfg.calculate(1990)).toBe(199) // R$ 19,90 -> R$ 1,99
    })

    it('PERCENTAGE arredonda para o centavo mais próximo', () => {
      const cfg = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 100, // 1%
      })
      expect(cfg.calculate(1999)).toBe(20) // 19.99 -> 20
      expect(cfg.calculate(1949)).toBe(19) // 19.49 -> 19
    })

    it('FIXED_PLUS_PERCENTAGE soma fixo + percentual', () => {
      const cfg = CommissionConfig.create({
        type: 'FIXED_PLUS_PERCENTAGE',
        fixedCents: 300,
        percentBps: 500, // 5%
      })
      // R$ 40,00 -> 300 + 200 = 500
      expect(cfg.calculate(4000)).toBe(500)
    })

    it('rejeita base negativa', () => {
      const cfg = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 100,
      })
      expect(() => cfg.calculate(-1)).toThrow(InvalidCommissionConfigError)
    })

    it('rejeita base não inteira', () => {
      const cfg = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 100,
      })
      expect(() => cfg.calculate(1.5)).toThrow(InvalidCommissionConfigError)
    })
  })

  describe('equals', () => {
    it('compara por type, fixed e percent', () => {
      const a = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 100,
      })
      const b = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 100,
      })
      const c = CommissionConfig.create({
        type: 'PERCENTAGE',
        fixedCents: 0,
        percentBps: 200,
      })
      expect(a.equals(b)).toBe(true)
      expect(a.equals(c)).toBe(false)
    })
  })
})
