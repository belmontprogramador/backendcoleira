import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../infrastructure/database/prisma.service'
import { PrismaDashboardMetricsRepository } from '../prisma-dashboard-metrics.repository'
import { DateRange } from '../../domain/value-objects/date-range.vo'
import { cleanDatabase } from '../../../../../test/helpers/clean-database'

/**
 * Cenário controlado para validar as agregações do dashboard.
 *
 * Período: 2026-08-01 → 2026-08-31.
 */
const range = DateRange.create(
  new Date('2026-08-01T00:00:00.000Z'),
  new Date('2026-08-31T23:59:59.999Z'),
)

describe('Dashboard — repositório de métricas (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaDashboardMetricsRepository

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
    repo = new PrismaDashboardMetricsRepository(prisma)
  })

  afterAll(async () => {
    await cleanDatabase(prisma)
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
  })

  async function seed(): Promise<void> {
    // Planos
    await prisma.plan.create({
      data: {
        id: 'plan-premium',
        code: 'PREMIUM',
        name: 'Premium',
        price_cents: 1990,
      },
    })
    await prisma.plan.create({
      data: {
        id: 'plan-basic',
        code: 'BASIC',
        name: 'Basic',
        price_cents: 0,
        is_default: true,
      },
    })

    // Roles
    await prisma.role.create({ data: { id: 'role-user', name: 'USER' } })
    await prisma.role.create({ data: { id: 'role-admin', name: 'ADMIN' } })

    // Usuários
    await prisma.user.create({
      data: {
        id: 'u-active',
        name: 'Active',
        email: 'active@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
        email_verified_at: new Date('2026-08-01T00:00:00.000Z'),
        created_at: new Date('2026-08-05T12:00:00.000Z'),
      },
    })
    await prisma.user.create({
      data: {
        id: 'u-blocked',
        name: 'Blocked',
        email: 'blocked@email.com',
        password_hash: 'x',
        status: 'BLOCKED',
        created_at: new Date('2026-08-10T12:00:00.000Z'),
      },
    })
    await prisma.user.create({
      data: {
        id: 'u-pending',
        name: 'Pending',
        email: 'pending@email.com',
        password_hash: 'x',
        status: 'PENDING_VERIFICATION',
        created_at: new Date('2026-07-01T12:00:00.000Z'),
      },
    })
    await prisma.user.create({
      data: {
        id: 'u-deleted',
        name: 'Deleted',
        email: 'deleted@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
        created_at: new Date('2026-08-15T12:00:00.000Z'),
        deleted_at: new Date('2026-08-20T12:00:00.000Z'),
      },
    })

    // Staff (deve ficar FORA das métricas de "Tutores")
    await prisma.user.create({
      data: {
        id: 'u-admin',
        name: 'Admin',
        email: 'admin@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
        created_at: new Date('2026-08-05T12:00:00.000Z'),
      },
    })
    await prisma.userRole.create({
      data: { user_id: 'u-admin', role_id: 'role-admin' },
    })

    // Clientes (role USER)
    for (const userId of ['u-active', 'u-blocked', 'u-pending', 'u-deleted']) {
      await prisma.userRole.create({
        data: { user_id: userId, role_id: 'role-user' },
      })
    }

    // Assinaturas
    const now = Date.now()
    await prisma.subscription.create({
      data: {
        id: 'sub-premium',
        user_id: 'u-active',
        plan_id: 'plan-premium',
        status: 'ACTIVE',
        started_at: new Date('2026-08-05T12:00:00.000Z'),
        current_period_start: new Date('2026-08-05T12:00:00.000Z'),
        current_period_end: new Date(now + 3 * 86_400_000),
      },
    })
    await prisma.subscription.create({
      data: {
        id: 'sub-basic',
        user_id: 'u-blocked',
        plan_id: 'plan-basic',
        status: 'ACTIVE',
        started_at: new Date('2026-08-10T12:00:00.000Z'),
        current_period_start: new Date('2026-08-10T12:00:00.000Z'),
        current_period_end: new Date(now + 10 * 86_400_000),
      },
    })
    await prisma.subscription.create({
      data: {
        id: 'sub-cancelled',
        user_id: 'u-pending',
        plan_id: 'plan-premium',
        status: 'CANCELLED',
        started_at: new Date('2026-08-20T12:00:00.000Z'),
        current_period_start: new Date('2026-08-20T12:00:00.000Z'),
        current_period_end: new Date(now - 86_400_000),
        cancelled_at: new Date('2026-08-20T12:00:00.000Z'),
      },
    })

    // Transações de pagamento
    const pay = (id: string, status: string, amount: number, createdAt: Date) =>
      prisma.paymentTransaction.create({
        data: {
          id,
          user_id: 'u-active',
          provider: 'MERCADO_PAGO',
          provider_payment_id: `pay-${id}`,
          payment_method: 'PIX',
          amount_cents: amount,
          status,
          created_at: createdAt,
        },
      })
    await pay('pay-1', 'APPROVED', 1990, new Date('2026-08-06T12:00:00.000Z'))
    await pay('pay-2', 'APPROVED', 1000, new Date('2026-08-07T12:00:00.000Z'))
    await pay('pay-3', 'PENDING', 1990, new Date('2026-08-08T12:00:00.000Z'))
    await pay('pay-4', 'REJECTED', 1990, new Date('2026-08-09T12:00:00.000Z'))
    await pay('pay-5', 'APPROVED', 5000, new Date('2026-07-01T12:00:00.000Z'))

    // Pets
    await prisma.pet.create({
      data: {
        id: 'pet-1',
        owner_id: 'u-active',
        name: 'Thor',
        species: 'Cão',
        photo_url: '/uploads/thor.jpg',
        created_at: new Date('2026-08-06T12:00:00.000Z'),
      },
    })
    await prisma.pet.create({
      data: {
        id: 'pet-2',
        owner_id: 'u-active',
        name: 'Mia',
        species: 'Gato',
        lost_status: true,
        created_at: new Date('2026-08-10T12:00:00.000Z'),
      },
    })
    await prisma.pet.create({
      data: {
        id: 'pet-deleted',
        owner_id: 'u-active',
        name: 'Rex',
        species: 'Cão',
        created_at: new Date('2026-08-12T12:00:00.000Z'),
        deleted_at: new Date('2026-08-15T12:00:00.000Z'),
      },
    })

    // Tags NFC
    await prisma.nfcTag.create({
      data: {
        id: 'tag-active',
        public_id: 'PUB-ACTIVE',
        activation_code_encrypted: 'x',
        status: 'ACTIVE',
        activated_at: new Date('2026-08-06T12:00:00.000Z'),
      },
    })
    await prisma.nfcTag.create({
      data: {
        id: 'tag-lost',
        public_id: 'PUB-LOST',
        activation_code_encrypted: 'x',
        status: 'LOST',
      },
    })
    await prisma.nfcTag.create({
      data: {
        id: 'tag-created',
        public_id: 'PUB-CREATED',
        activation_code_encrypted: 'x',
        status: 'CREATED',
      },
    })

    // Eventos de acesso
    const evt = (
      id: string,
      petId: string,
      source: string,
      ip: string,
      createdAt: Date,
    ) =>
      prisma.accessEvent.create({
        data: { id, pet_id: petId, source, ip_hash: ip, created_at: createdAt },
      })
    await evt(
      'evt-1',
      'pet-1',
      'NFC',
      '1.1.1.1',
      new Date('2026-08-06T12:00:00.000Z'),
    )
    await evt(
      'evt-2',
      'pet-1',
      'QR',
      '1.1.1.1',
      new Date('2026-08-07T12:00:00.000Z'),
    )
    await evt(
      'evt-3',
      'pet-2',
      'NFC',
      '2.2.2.2',
      new Date('2026-08-08T12:00:00.000Z'),
    )
    await evt(
      'evt-4',
      'pet-1',
      'NFC',
      '1.1.1.1',
      new Date('2026-08-09T12:00:00.000Z'),
    )
    await evt(
      'evt-out',
      'pet-1',
      'NFC',
      '1.1.1.1',
      new Date('2026-07-01T12:00:00.000Z'),
    )

    // Mensagens de contato
    await prisma.contactMessage.create({
      data: {
        id: 'msg-1',
        pet_id: 'pet-1',
        message: 'Oi',
        location_approx: 'São Paulo, SP, Brasil',
        created_at: new Date('2026-08-06T12:00:00.000Z'),
      },
    })
    await prisma.contactMessage.create({
      data: {
        id: 'msg-2',
        pet_id: 'pet-1',
        message: 'Achei seu pet',
        read_at: new Date('2026-08-07T12:00:00.000Z'),
        created_at: new Date('2026-08-07T12:00:00.000Z'),
      },
    })
  }

  it('countUsers agrega status, novos, verificados e premium (só clientes)', async () => {
    await seed()
    const users = await repo.countUsers(range)

    expect(users.total).toBe(3) // u-deleted (soft delete) e u-admin (staff) fora
    expect(users.new).toBe(2) // u-active + u-blocked (u-admin criado em 08-05 fica fora)
    expect(users.active).toBe(1)
    expect(users.blocked).toBe(1)
    expect(users.pendingVerification).toBe(1)
    expect(users.verifiedEmail).toBe(1)
    expect(users.premium).toBe(1) // só u-active tem sub premium ativa
  })

  it('countPets agrega total, novos, perdidos, foto e espécie', async () => {
    await seed()
    const pets = await repo.countPets(range)

    expect(pets.total).toBe(2)
    expect(pets.new).toBe(2)
    expect(pets.lost).toBe(1)
    expect(pets.withPhoto).toBe(1)
    expect(pets.bySpecies).toEqual({ Cão: 1, Gato: 1 })
  })

  it('subscriptionStats calcula status, MRR, churn e renovações', async () => {
    await seed()
    const subs = await repo.subscriptionStats(range)

    expect(subs.active).toBe(2)
    expect(subs.trialing).toBe(0)
    expect(subs.cancelled).toBe(1)
    expect(subs.new).toBe(3)
    expect(subs.churn).toBe(1)
    expect(subs.mrrCents).toBe(1990)
    expect(subs.premiumCount).toBe(1)
    expect(subs.basicCount).toBe(1)
    expect(subs.upcomingRenewals7d).toBe(1)
    expect(subs.upcomingRenewals30d).toBe(2)
  })

  it('paymentStats calcula receita, ticket médio e conversão', async () => {
    await seed()
    const payments = await repo.paymentStats(range)

    expect(payments.revenueCents).toBe(2990) // 1990 + 1000 (fora do range não conta)
    expect(payments.approvedCount).toBe(2)
    expect(payments.pendingCount).toBe(1)
    expect(payments.rejectedCount).toBe(1)
    expect(payments.avgTicketCents).toBe(1495) // (1990+1000)/2
    expect(payments.conversionRate).toBe(0.5) // 2 aprovadas de 4 no range
  })

  it('scanStats agrega total, únicos, source e top pets', async () => {
    await seed()
    const scans = await repo.scanStats(range)

    expect(scans.total).toBe(4) // evt-out excluído
    expect(scans.uniquePets).toBe(2)
    expect(scans.uniqueVisitors).toBe(2) // 1.1.1.1 e 2.2.2.2
    expect(scans.bySource).toEqual({ NFC: 3, QR: 1 })
    expect(scans.topPets[0]).toEqual({ petId: 'pet-1', name: 'Thor', count: 3 })
  })

  it('contactStats agrega total, não lidas e com localização', async () => {
    await seed()
    const contacts = await repo.contactStats(range)

    expect(contacts.total).toBe(2)
    expect(contacts.unread).toBe(1)
    expect(contacts.withLocation).toBe(1)
  })

  it('nfcStats agrega tags por status e ativações', async () => {
    await seed()
    const nfc = await repo.nfcStats(range)

    expect(nfc.totalTags).toBe(3)
    expect(nfc.activeTags).toBe(1)
    expect(nfc.lostTags).toBe(1)
    expect(nfc.activatedInPeriod).toBe(1)
    expect(nfc.byStatus).toEqual({ ACTIVE: 1, LOST: 1, CREATED: 1 })
  })

  it('timeseries signups agrupa por dia (preenchido com zeros)', async () => {
    await seed()
    const series = await repo.timeseries('signups', range, 'day')

    expect(series.length).toBe(31) // 2026-08-01 .. 2026-08-31
    expect(series[0]).toEqual({ bucket: '2026-08-01', value: 0 })
    expect(series.filter(p => p.value !== 0)).toEqual([
      { bucket: '2026-08-05', value: 1 },
      { bucket: '2026-08-10', value: 1 },
    ])
  })

  it('timeseries signups agrega por mês', async () => {
    await seed()
    const series = await repo.timeseries('signups', range, 'month')

    expect(series).toEqual([{ bucket: '2026-08-01', value: 2 }])
  })

  it('timeseries scans agrupa por dia (preenchido com zeros)', async () => {
    await seed()
    const series = await repo.timeseries('scans', range, 'day')

    expect(series.length).toBe(31)
    expect(series.filter(p => p.value !== 0)).toEqual([
      { bucket: '2026-08-06', value: 1 },
      { bucket: '2026-08-07', value: 1 },
      { bucket: '2026-08-08', value: 1 },
      { bucket: '2026-08-09', value: 1 },
    ])
  })

  it('timeseries revenue soma valores aprovados por dia (preenchido com zeros)', async () => {
    await seed()
    const series = await repo.timeseries('revenue', range, 'day')

    expect(series.length).toBe(31)
    expect(series.filter(p => p.value !== 0)).toEqual([
      { bucket: '2026-08-06', value: 1990 },
      { bucket: '2026-08-07', value: 1000 },
    ])
  })

  it('timeseries newSubscriptions agrupa por dia (preenchido com zeros)', async () => {
    await seed()
    const series = await repo.timeseries('newSubscriptions', range, 'day')

    expect(series.length).toBe(31)
    expect(series.filter(p => p.value !== 0)).toEqual([
      { bucket: '2026-08-05', value: 1 },
      { bucket: '2026-08-10', value: 1 },
      { bucket: '2026-08-20', value: 1 },
    ])
  })
})
