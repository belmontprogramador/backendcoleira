import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaPetOwnerInfo } from '../prisma-pet-owner-info'

describe('PrismaPetOwnerInfo (integração)', () => {
  let prisma: PrismaService
  let ownerInfo: PrismaPetOwnerInfo

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
    ownerInfo = new PrismaPetOwnerInfo(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.user.deleteMany()
    for (const id of ['u1', 'u2']) {
      await prisma.user.create({
        data: {
          id,
          name: `Dono ${id}`,
          email: `${id}@email.com`,
          password_hash: 'x',
          status: 'ACTIVE',
        },
      })
    }
  })

  it('retorna id/name/email dos donos em lote', async () => {
    const owners = await ownerInfo.findByIds(['u1', 'u2'])
    expect(owners).toHaveLength(2)
    expect(owners).toEqual(
      expect.arrayContaining([
        { id: 'u1', name: 'Dono u1', email: 'u1@email.com' },
        { id: 'u2', name: 'Dono u2', email: 'u2@email.com' },
      ]),
    )
  })

  it('retorna array vazio para lista vazia', async () => {
    const owners = await ownerInfo.findByIds([])
    expect(owners).toEqual([])
  })

  it('ignora ids inexistentes', async () => {
    const owners = await ownerInfo.findByIds(['u1', 'nao-existe'])
    expect(owners).toHaveLength(1)
    expect(owners[0].id).toBe('u1')
  })
})
