import { Shipment } from '../../../domain/entities/shipment.entity'
import type { ShipmentModel } from '../../../../../generated/prisma/models/Shipment'
import { ShipmentMapper } from '../shipment.mapper'

function makeShipment(): Shipment {
  const shipment = Shipment.create({
    id: 'shp-1',
    orderId: 'ord-1',
    meOrderId: 'me-1',
    protocol: 'P1',
    serviceId: 1,
    tracking: 'BR123',
    labelUrl: 'https://l/1',
  })
  shipment.markPosted()
  return shipment
}

describe('ShipmentMapper', () => {
  it('toPersistence mapeia para snake_case', () => {
    const p = ShipmentMapper.toPersistence(makeShipment())

    expect(p.id).toBe('shp-1')
    expect(p.order_id).toBe('ord-1')
    expect(p.me_order_id).toBe('me-1')
    expect(p.protocol).toBe('P1')
    expect(p.service_id).toBe(1)
    expect(p.status).toBe('POSTED')
    expect(p.tracking).toBe('BR123')
    expect(p.label_url).toBe('https://l/1')
    expect(p.tracking_url).toBeNull()
  })

  it('toDomain reconstitute a partir do model', () => {
    const model = {
      id: 'shp-1',
      order_id: 'ord-1',
      me_order_id: 'me-1',
      protocol: 'P1',
      service_id: 1,
      status: 'POSTED',
      tracking: 'BR123',
      tracking_url: null,
      label_url: 'https://l/1',
      created_at: new Date(),
      updated_at: new Date(),
    } as unknown as ShipmentModel

    const shipment = ShipmentMapper.toDomain(model)

    expect(shipment.id).toBe('shp-1')
    expect(shipment.orderId).toBe('ord-1')
    expect(shipment.meOrderId).toBe('me-1')
    expect(shipment.status).toBe('POSTED')
    expect(shipment.tracking).toBe('BR123')
  })
})
