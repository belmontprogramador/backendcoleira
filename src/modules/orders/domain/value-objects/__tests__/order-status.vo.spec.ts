import { isOrderStatus, ORDER_STATUS_VALUES } from '../order-status.vo'

describe('OrderStatus', () => {
  it('reconhece todos os status', () => {
    for (const value of ORDER_STATUS_VALUES) {
      expect(isOrderStatus(value)).toBe(true)
    }
  })

  it('rejeita valor desconhecido', () => {
    expect(isOrderStatus('UNKNOWN')).toBe(false)
    expect(isOrderStatus('')).toBe(false)
  })
})
