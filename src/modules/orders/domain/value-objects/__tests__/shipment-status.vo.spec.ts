import { isShipmentStatus, SHIPMENT_STATUS_VALUES } from '../shipment-status.vo'

describe('ShipmentStatus', () => {
  it('contém os estados esperados', () => {
    expect(SHIPMENT_STATUS_VALUES).toEqual([
      'PENDING',
      'POSTED',
      'DELIVERED',
      'CANCELLED',
    ])
  })

  it('isShipmentStatus aceita estados válidos', () => {
    for (const s of SHIPMENT_STATUS_VALUES) {
      expect(isShipmentStatus(s)).toBe(true)
    }
  })

  it('isShipmentStatus rejeita valores inválidos', () => {
    expect(isShipmentStatus('PAID')).toBe(false)
    expect(isShipmentStatus('')).toBe(false)
    expect(isShipmentStatus('pending')).toBe(false)
  })
})
