import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../src/infrastructure/database/prisma.service'
import { BcryptPasswordHasher } from '../src/infrastructure/crypto/bcrypt-password.hasher'
import { SeedRunner } from '../src/infrastructure/seed/seed.runner'

/**
 * Script de seed (executado via `prisma db seed` ou `npm run prisma:seed`).
 * Popula roles, permissões e usuários admin padrão.
 */
async function main(): Promise<void> {
  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD ?? '',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? '',
        SYSTEM_USER_PASSWORD: process.env.SYSTEM_USER_PASSWORD ?? '',
      }
      const value = map[key]
      if (!value) {
        throw new Error(`Missing env var: ${key}`)
      }
      return value
    },
  } as ConfigService

  const prisma = new PrismaService(config)
  const hasher = new BcryptPasswordHasher()
  const runner = new SeedRunner(prisma, hasher, config)

  try {
    await runner.run()
    console.log('Seed concluída com sucesso. 🌱')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error('Seed falhou:', error)
  process.exit(1)
})
