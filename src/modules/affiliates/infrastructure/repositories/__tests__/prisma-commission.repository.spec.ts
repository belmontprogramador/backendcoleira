import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Commission } from '../../../domain/entities/commission.entity'
import { CommissionConfig } from '../../../domain/value-objects/commission-config.vo'
import { PrismaCommissionRepository } from '../prisma-commission.repository'

// IDs únicos (prefixo `c-`) para não colidir com outros specs de repositório
// que compartilham o mesmo Postgres DEV e usam IDs fixos.
const AFF = 'c-aff'
const USER = 'c-user'
const PROD = 'c-prod'
const ORDER = 'c-ord'
const PLAN = 'c-plan'
const SUB = 'c-sub'

describe('Commission — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaCommissionRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  const cfg = CommissionConfig.create({
    type: 'PERCENTAGE',
    fixedCents: 0,
    percentBps: 1000, // 10%
  })

  beforeAll(async () => {
    prisma = new PrismaService(config)
    repo = new PrismaCommissionRepository(prisma)

    await prisma.affiliate.create({
      data: { id: AFF, code: 'c-ana123', name: 'Ana', email: 'c-ana@example.com' },
    })
    await prisma.user.create({
      data: {
        id: USER,
        name: 'Test',
        email: 'c-test@example.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
    await prisma.product.create({
      data: { id: PROD, sku: 'c-pingente', name: 'Pingente', price_cents: 1990 },
    })
    await prisma.order.create({
      data: {
        id: ORDER,
        buyer_id: USER,
        product_id: PROD,
        unit_price: 1990,
        quantity: 1,
        freight_price: 0,
        payment_method: 'PIX',
        ship_postal_code: '00000000',
        ship_street: 'Rua',
        ship_number: '1',
        ship_city: 'Cidade',
        ship_state: 'RJ',
        ship_name: 'Ana',
        ship_phone: '21999999999',
      },
    })
    await prisma.plan.create({
      data: { id: PLAN, code: 'C_PREMIUM', name: 'Premium', price_cents: 4900 },
    })
    await prisma.subscription.create({
      data: {
        id: SUB,
        user_id: USER,
        plan_id: PLAN,
        started_at: new Date(),
        current_period_start: new Date(),
        current_period_end: new Date(),
      },
    })
  })

  afterAll(async () => {
    await prisma.commission.deleteMany()
    await prisma.order.deleteMany({ where: { id: ORDER } })
    await prisma.subscription.deleteMany({ where: { id: SUB } })
    await prisma.product.deleteMany({ where: { id: PROD } })
    await prisma.plan.deleteMany({ where: { id: PLAN } })
    await prisma.user.deleteMany({ where: { id: USER } })
    await prisma.affiliate.deleteMany({ where: { id: AFF } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.commission.deleteMany()
  })

  it('save persiste comissão de venda e findByOrderId a recupera', async () => {
    const commission = Commission.create({
      id: 'c-com-1',
      affiliateId: AFF,
      source: 'ORDER',
      orderId: ORDER,
      baseAmountCents: 1990,
      commission: cfg,
    })

    const saved = await repo.save(commission)
    expect(saved.amountCents).toBe(199)

    const found = await repo.findByOrderId(ORDER)
    expect(found?.id).toBe('c-com-1')
    expect(found?.affiliateId).toBe(AFF)
    expect(await repo.findBySubscriptionId('X')).toBeNull()
  })

  it('sumAvailableByAffiliateId soma apenas AVAILABLE', async () => {
    const c1 = Commission.create({
      id: 'c-com-1',
      affiliateId: AFF,
      source: 'ORDER',
      orderId: ORDER,
      baseAmountCents: 1990,
      commission: cfg, // 199
    })
    const c2 = Commission.create({
      id: 'c-com-2',
      affiliateId: AFF,
      source: 'SUBSCRIPTION',
      subscriptionId: SUB,
      baseAmountCents: 4900,
      commission: cfg, // 490
    })
    c2.cancel()

    await repo.save(c1)
    await repo.save(c2)

    expect(await repo.sumAvailableByAffiliateId(AFF)).toBe(199)
  })

  it('aggregateByAffiliateId agrega vendas, assinaturas, receita e saldo', async () => {
    const c1 = Commission.create({
      id: 'c-com-1',
      affiliateId: AFF,
      source: 'ORDER',
      orderId: ORDER,
      baseAmountCents: 1990,
      commission: cfg, // 199
    })
    const c2 = Commission.create({
      id: 'c-com-2',
      affiliateId: AFF,
      source: 'SUBSCRIPTION',
      subscriptionId: SUB,
      baseAmountCents: 4900,
      commission: cfg, // 490
    })
    const c3 = Commission.create({
      id: 'c-com-3',
      affiliateId: AFF,
      source: 'ORDER',
      orderId: ORDER,
      baseAmountCents: 1000,
      commission: cfg, // 100
    })
    c3.cancel()

    await repo.save(c1)
    await repo.save(c2)
    await repo.save(c3)

    const agg = await repo.aggregateByAffiliateId(AFF)
    expect(agg.sales.count).toBe(2)
    expect(agg.subscriptions.count).toBe(1)
    expect(agg.sales.revenueCents).toBe(1990 + 1000)
    expect(agg.subscriptions.revenueCents).toBe(4900)
    expect(agg.sales.commissionCents).toBe(199 + 100)
    expect(agg.subscriptions.commissionCents).toBe(490)
    expect(agg.availableCents).toBe(199 + 490)
  })
})
