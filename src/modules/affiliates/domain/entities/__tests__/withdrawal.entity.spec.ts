import {
  Withdrawal,
  InvalidWithdrawalError,
} from '../withdrawal.entity'

describe('Withdrawal', () => {
  const base = {
    id: 'wd_1',
    affiliateId: 'aff_1',
    amountCents: 5000,
    pixKey: 'ana@pix.com',
  }

  describe('create', () => {
    it('cria saque RECEIVED com snapshot da pix', () => {
      const w = Withdrawal.create(base)
      expect(w.status).toBe('RECEIVED')
      expect(w.amountCents).toBe(5000)
      expect(w.pixKey).toBe('ana@pix.com')
      expect(w.processedAt).toBeNull()
      expect(w.paidAt).toBeNull()
    })

    it('rejeita valor <= 0', () => {
      expect(() => Withdrawal.create({ ...base, amountCents: 0 })).toThrow(
        InvalidWithdrawalError,
      )
      expect(() => Withdrawal.create({ ...base, amountCents: -5 })).toThrow(
        InvalidWithdrawalError,
      )
    })

    it('rejeita valor não inteiro', () => {
      expect(() => Withdrawal.create({ ...base, amountCents: 10.5 })).toThrow(
        InvalidWithdrawalError,
      )
    })

    it('rejeita pixKey vazia', () => {
      expect(() => Withdrawal.create({ ...base, pixKey: '   ' })).toThrow(
        InvalidWithdrawalError,
      )
    })

    it('trima a pixKey', () => {
      const w = Withdrawal.create({ ...base, pixKey: '  ana@pix.com  ' })
      expect(w.pixKey).toBe('ana@pix.com')
    })
  })

  describe('máquina de estados', () => {
    it('RECEIVED → PROCESSING → PAID (fluxo feliz)', () => {
      const w = Withdrawal.create(base)
      w.markProcessing()
      expect(w.status).toBe('PROCESSING')
      expect(w.processedAt).toBeInstanceOf(Date)
      w.markPaid()
      expect(w.status).toBe('PAID')
      expect(w.paidAt).toBeInstanceOf(Date)
    })

    it('RECEIVED → REJECTED é válido', () => {
      const w = Withdrawal.create(base)
      w.markRejected()
      expect(w.status).toBe('REJECTED')
    })

    it('PROCESSING → REJECTED é válido', () => {
      const w = Withdrawal.create(base)
      w.markProcessing()
      w.markRejected()
      expect(w.status).toBe('REJECTED')
    })

    it('PAID não pode transicionar', () => {
      const w = Withdrawal.create(base)
      w.markProcessing()
      w.markPaid()
      expect(() => w.markRejected()).toThrow(InvalidWithdrawalError)
      expect(() => w.markProcessing()).toThrow(InvalidWithdrawalError)
    })

    it('REJECTED não pode transicionar', () => {
      const w = Withdrawal.create(base)
      w.markRejected()
      expect(() => w.markProcessing()).toThrow(InvalidWithdrawalError)
      expect(() => w.markPaid()).toThrow(InvalidWithdrawalError)
    })
  })
})
