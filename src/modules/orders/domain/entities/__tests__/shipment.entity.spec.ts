import {
  InvalidShipmentError,
  InvalidShipmentStatusTransitionError,
  Shipment,
} from '../shipment.entity'

const baseProps = {
  id: 'shp-1',
  orderId: 'ord-1',
  meOrderId: 'me-1',
  protocol: 'P1',
  serviceId: 1,
}

describe('Shipment', () => {
  it('cria um envio PENDING com tracking null', () => {
    const s = Shipment.create(baseProps)
    expect(s.status).toBe('PENDING')
    expect(s.tracking).toBeNull()
    expect(s.trackingUrl).toBeNull()
    expect(s.labelUrl).toBeNull()
  })

  it('markPosted → POSTED e markDelivered → DELIVERED', () => {
    const s = Shipment.create(baseProps)
    s.markPosted()
    expect(s.status).toBe('POSTED')
    s.markDelivered()
    expect(s.status).toBe('DELIVERED')
  })

  it('rejeita transição PENDING → DELIVERED', () => {
    const s = Shipment.create(baseProps)
    expect(() => s.markDelivered()).toThrow(InvalidShipmentStatusTransitionError)
  })

  it('rejeita markPosted repetido', () => {
    const s = Shipment.create(baseProps)
    s.markPosted()
    expect(() => s.markPosted()).toThrow(InvalidShipmentStatusTransitionError)
  })

  it('rejeita id vazio', () => {
    expect(() => Shipment.create({ ...baseProps, id: '' })).toThrow(
      InvalidShipmentError,
    )
  })

  it('rejeita meOrderId vazio', () => {
    expect(() => Shipment.create({ ...baseProps, meOrderId: '' })).toThrow(
      InvalidShipmentError,
    )
  })

  it('rejeita serviceId < 1', () => {
    expect(() => Shipment.create({ ...baseProps, serviceId: 0 })).toThrow(
      InvalidShipmentError,
    )
  })

  it('reconstitute restaura o estado', () => {
    const now = new Date()
    const s = Shipment.reconstitute({
      ...baseProps,
      status: 'POSTED',
      tracking: 'BR123',
      trackingUrl: 'https://t/1',
      labelUrl: 'https://l/1',
      createdAt: now,
      updatedAt: now,
    })
    expect(s.status).toBe('POSTED')
    expect(s.tracking).toBe('BR123')
    expect(s.meOrderId).toBe('me-1')
  })
})
