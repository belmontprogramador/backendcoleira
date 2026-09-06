import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { Shipment } from '../../../domain/entities/shipment.entity'
import { OrderMapper } from '../../mappers/order.mapper'
import { PrismaShipmentRepository } from '../prisma-shipment.repository'
import { cleanDatabase } from '../../../../../../test/helpers/clean-database'

const shipTo = ShipTo.create({
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'SP',
  name: 'Fulano',
  phone: '11999999999',
})

describe('Shipment — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaShipmentRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  async function seed(): Promise<void> {
    await prisma.user.create({
      data: {
        id: 'user-1',
        name: 'Owner',
        email: 'owner@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    await prisma.product.create({
      data: { id: 'product-1', sku: 'pingente', name: 'Pingente', price_cents: 1990 },
    })
    const order = Order.create({
      id: 'ord-1',
      buyerId: 'user-1',
      productId: 'product-1',
      unitPrice: Price.create(1990),
      paymentMethod: 'PIX',
      shipTo,
    })
    await prisma.order.create({ data: OrderMapper.toPersistence(order) })
  }

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaShipmentRepository(prisma)
  })

  afterAll(async () => {
    await cleanDatabase(prisma)
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
    await seed()
  })

  it('save persiste e findByOrderId recupera', async () => {
    const shipment = Shipment.create({
      id: 'shp-1',
      orderId: 'ord-1',
      meOrderId: 'me-1',
      protocol: 'P1',
      serviceId: 1,
      tracking: 'BR123',
    })
    shipment.markPosted()
    await repo.save(shipment)

    const found = await repo.findByOrderId('ord-1')

    expect(found).not.toBeNull()
    expect(found?.id).toBe('shp-1')
    expect(found?.meOrderId).toBe('me-1')
    expect(found?.status).toBe('POSTED')
    expect(found?.tracking).toBe('BR123')
    expect(await repo.findByOrderId('inexistente')).toBeNull()
  })

  it('findByMeOrderId recupera pela id da etiqueta ME', async () => {
    const shipment = Shipment.create({
      id: 'shp-1',
      orderId: 'ord-1',
      meOrderId: 'me-1',
      protocol: 'P1',
      serviceId: 1,
    })
    await repo.save(shipment)

    const found = await repo.findByMeOrderId('me-1')

    expect(found?.id).toBe('shp-1')
    expect(found?.orderId).toBe('ord-1')
    expect(await repo.findByMeOrderId('inexistente')).toBeNull()
  })
})
