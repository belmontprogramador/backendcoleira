import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'
import { Aes256GcmCipher } from '../aes256-gcm-cipher'
import { PrismaShippingTokenStore } from '../prisma-shipping-token.store'

const TEST_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('Shipping — token store (integração)', () => {
  let prisma: PrismaService
  let store: PrismaShippingTokenStore

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
    await prisma.$connect()
    store = new PrismaShippingTokenStore(
      prisma,
      new Aes256GcmCipher(TEST_KEY),
    )
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.shippingCredential.deleteMany()
  })

  it('get retorna null sem credencial', async () => {
    await expect(store.get()).resolves.toBeNull()
  })

  it('salva e recupera a credencial (cifrada em repouso)', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00Z')
    await store.save({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      expiresAt,
    })

    const got = await store.get()
    expect(got).toEqual({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      expiresAt,
    })

    const row = await prisma.shippingCredential.findFirst()
    expect(row?.access_token).not.toContain('at-123')
    expect(row?.refresh_token).not.toContain('rt-456')
  })

  it('save sobrescreve a credencial (linha única)', async () => {
    await store.save({
      accessToken: 'old',
      refreshToken: 'old-r',
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    })
    await store.save({
      accessToken: 'new',
      refreshToken: 'new-r',
      expiresAt: new Date('2026-02-01T00:00:00Z'),
    })

    const got = await store.get()
    expect(got?.accessToken).toBe('new')
    expect(got?.refreshToken).toBe('new-r')
    expect(await prisma.shippingCredential.count()).toBe(1)
  })
})
