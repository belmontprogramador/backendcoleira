import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Price } from '../../../../../common/value-objects/price.vo'
import { PrismaProductRepository } from '../prisma-product.repository'

describe('Product — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaProductRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(() => {
    prisma = new PrismaService(config)
    repo = new PrismaProductRepository(prisma)
  })

  afterAll(async () => {
    await prisma.product.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.product.deleteMany()
  })

  it('findBySku e findById retornam o produto', async () => {
    await prisma.product.create({
      data: {
        id: 'prod-1',
        sku: 'pingente',
        name: 'Pingente',
        price_cents: 1990,
      },
    })

    const bySku = await repo.findBySku('pingente')
    const byId = await repo.findById('prod-1')

    expect(bySku?.name).toBe('Pingente')
    expect(bySku?.price.amountInCents).toBe(1990)
    expect(byId?.id).toBe('prod-1')
  })

  it('retorna null quando não encontra', async () => {
    expect(await repo.findBySku('X')).toBeNull()
    expect(await repo.findById('X')).toBeNull()
  })

  it('update persiste campos editáveis', async () => {
    await prisma.product.create({
      data: {
        id: 'prod-1',
        sku: 'pingente',
        name: 'Pingente',
        price_cents: 1990,
      },
    })

    const product = (await repo.findById('prod-1'))!
    product.updateDetails({
      name: 'Pingente Premium',
      price: Price.create(2990),
      active: false,
    })

    const updated = await repo.update(product)

    expect(updated.name).toBe('Pingente Premium')
    expect(updated.price.amountInCents).toBe(2990)
    expect(updated.active).toBe(false)
  })
})
