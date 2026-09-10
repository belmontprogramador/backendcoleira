import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { Affiliate } from '../../../domain/entities/affiliate.entity'
import { CommissionConfig } from '../../../domain/value-objects/commission-config.vo'
import { PrismaAffiliateRepository } from '../prisma-affiliate.repository'

// IDs únicos (prefixo `a-`) para não colidir com outros specs de repositório.
const USER = 'a-user'
const AFF1 = 'a-aff-1'
const AFF2 = 'a-aff-2'

describe('Affiliate — repositório (integração)', () => {
  let prisma: PrismaService
  let repo: PrismaAffiliateRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(async () => {
    prisma = new PrismaService(config)
    repo = new PrismaAffiliateRepository(prisma)
    await prisma.user.create({
      data: {
        id: USER,
        name: 'Test',
        email: 'a-test@example.com',
        password_hash: 'x',
        status: 'ACTIVE',
      },
    })
  })

  afterAll(async () => {
    await prisma.affiliate.deleteMany({
      where: { id: { in: [AFF1, AFF2, 'a-aff-other'] } },
    })
    await prisma.user.deleteMany({ where: { id: USER } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.affiliate.deleteMany()
  })

  it('save cria e depois atualiza (upsert por id)', async () => {
    const affiliate = Affiliate.create({
      id: AFF1,
      code: 'a-ana123',
      name: 'Ana',
      email: 'a-ana@example.com',
    })

    const created = await repo.save(affiliate)
    expect(created.id).toBe(AFF1)
    expect(created.code).toBe('a-ana123')

    created.changeSaleCommission(
      CommissionConfig.create({ type: 'FIXED', fixedCents: 500, percentBps: 0 }),
    )
    created.updateDetails({ name: 'Ana Souza' })

    const updated = await repo.save(created)
    expect(updated.name).toBe('Ana Souza')
    expect(updated.saleCommission.fixedCents).toBe(500)
  })

  it('findByCode / findByEmail / findByUserId / findById', async () => {
    const affiliate = Affiliate.create({
      id: AFF1,
      userId: USER,
      code: 'a-ana123',
      name: 'Ana',
      email: 'a-ana@example.com',
    })
    await repo.save(affiliate)

    expect((await repo.findByCode('a-ana123'))?.id).toBe(AFF1)
    expect((await repo.findByEmail('A-ANA@example.com'))?.id).toBe(AFF1)
    expect((await repo.findByUserId(USER))?.id).toBe(AFF1)
    expect((await repo.findById(AFF1))?.id).toBe(AFF1)
    expect(await repo.findByCode('X')).toBeNull()
  })

  it('list e count aplicam filtro de status e search', async () => {
    const a1 = Affiliate.create({
      id: AFF1,
      code: 'a-ana123',
      name: 'Ana',
      email: 'a-ana@example.com',
    })
    const a2 = Affiliate.create({
      id: AFF2,
      code: 'a-bia456',
      name: 'Bia',
      email: 'a-bia@example.com',
    })
    a2.deactivate()
    await repo.save(a1)
    await repo.save(a2)

    const all = await repo.list({ page: 1, limit: 10 })
    expect(all.length).toBe(2)

    const active = await repo.list({ page: 1, limit: 10, status: 'ACTIVE' })
    expect(active.map(a => a.id)).toEqual([AFF1])

    const searched = await repo.list({ page: 1, limit: 10, search: 'bia' })
    expect(searched.map(a => a.id)).toEqual([AFF2])

    expect(await repo.count({ page: 1, limit: 10 })).toBe(2)
    expect(await repo.count({ page: 1, limit: 10, status: 'INACTIVE' })).toBe(1)
  })
})
