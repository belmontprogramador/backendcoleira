import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Price } from '../../../../../common/value-objects/price.vo'
import { ShipTo } from '../../../domain/value-objects/ship-to.vo'
import { Order } from '../../../domain/entities/order.entity'
import { PrismaOrderRepository } from '../prisma-order.repository'
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

function makeOrder(id: string, buyerId: string): Order {
  return Order.create({
    id,
    buyerId,
    productId: 'product-1',
    unitPrice: Price.create(1990),
    quantity: 1,
    freightPrice: Price.create(1860),
    paymentMethod: 'PIX',
    shipTo,
    freightServiceId: 1,
  })
}

describe('Order — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaOrderRepository

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
    await prisma.user.create({
      data: {
        id: 'user-2',
        name: 'Other',
        email: 'other@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    await prisma.product.create({
      data: { id: 'product-1', sku: 'pingente', name: 'Pingente', price_cents: 1990 },
    })
  }

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaOrderRepository(prisma)
  })

  afterAll(async () => {
    await cleanDatabase(prisma)
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
    await seed()
  })

  it('save persiste e findById recupera (snapshot do preço)', async () => {
    await repo.save(makeOrder('ord-1', 'user-1'))

    const found = await repo.findById('ord-1')

    expect(found).not.toBeNull()
    expect(found?.status).toBe('PENDING')
    expect(found?.buyerId).toBe('user-1')
    expect(found?.totalPrice.amountInCents).toBe(1990 + 1860)
    expect(found?.shipTo.city).toBe('São Paulo')
  })

  it('findByPaymentId recupera pela id do pagamento', async () => {
    const order = makeOrder('ord-1', 'user-1')
    order.attachPayment('mp-1')
    await repo.save(order)

    const found = await repo.findByPaymentId('mp-1')

    expect(found?.id).toBe('ord-1')
    expect(await repo.findByPaymentId('inexistente')).toBeNull()
  })

  it('save atualiza (markPaid persiste a transição)', async () => {
    const order = makeOrder('ord-1', 'user-1')
    await repo.save(order)

    order.markPaid()
    await repo.save(order)

    const found = await repo.findById('ord-1')
    expect(found?.status).toBe('PAID')
    expect(found?.paidAt).not.toBeNull()
  })

  it('list + count filtram por buyerId e status', async () => {
    await repo.save(makeOrder('ord-1', 'user-1'))
    const paid = makeOrder('ord-2', 'user-1')
    paid.markPaid()
    await repo.save(paid)
    const paid2 = makeOrder('ord-3', 'user-2')
    paid2.markPaid()
    await repo.save(paid2)

    const mine = await repo.list({ page: 1, limit: 10, buyerId: 'user-1' })
    expect(mine.map(o => o.id).sort()).toEqual(['ord-1', 'ord-2'])

    const paidOrders = await repo.list({ page: 1, limit: 10, status: 'PAID' })
    expect(paidOrders.map(o => o.id).sort()).toEqual(['ord-2', 'ord-3'])

    expect(
      await repo.count({ page: 1, limit: 10, buyerId: 'user-1' }),
    ).toBe(2)
    expect(await repo.count({ page: 1, limit: 10, status: 'PAID' })).toBe(2)
  })
})
