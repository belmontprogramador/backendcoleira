import { Shipment } from '../../../domain/entities/shipment.entity'
import { TrackOrderUseCase } from '../track-order.use-case'

function makeShipment(): Shipment {
  const s = Shipment.create({
    id: 'shp-1',
    orderId: 'ord-1',
    meOrderId: 'me-1',
    protocol: 'P1',
    serviceId: 1,
  })
  s.markPosted()
  return s
}

function makeSut() {
  const shipments = { findByOrderId: jest.fn() }
  const shipping = { track: jest.fn() }

  const useCase = new TrackOrderUseCase(shipments as never, shipping as never)

  return { shipments, shipping, useCase }
}

describe('TrackOrderUseCase', () => {
  it('consulta o rastreio via meOrderId do envio', async () => {
    const { shipments, shipping, useCase } = makeSut()
    shipments.findByOrderId.mockResolvedValue(makeShipment())
    shipping.track.mockResolvedValue({ 'me-1': { status: 'delivered' } })

    const result = await useCase.execute({ orderId: 'ord-1' })

    expect(shipping.track).toHaveBeenCalledWith(['me-1'])
    expect(result).toEqual({ 'me-1': { status: 'delivered' } })
  })

  it('retorna null sem envio registrado', async () => {
    const { shipments, shipping, useCase } = makeSut()
    shipments.findByOrderId.mockResolvedValue(null)

    const result = await useCase.execute({ orderId: 'ord-1' })

    expect(result).toBeNull()
    expect(shipping.track).not.toHaveBeenCalled()
  })
})
