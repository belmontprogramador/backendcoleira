import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

/**
 * Implementação concreta da porta de banco de dados usando Prisma 7.
 *
 * Prisma 7 — modelo desacoplado:
 *   - O cliente NÃO abre nem gerencia a conexão. Ele recebe uma conexão
 *     pronta de um driver adapter (`@prisma/adapter-pg`, que usa `pg`).
 *   - A URL de conexão é resolvida aqui (via ConfigService) e injetada no
 *     adapter. O Prisma apenas consome a conexão que recebe.
 *
 * Esta classe é infraestrutura pura e plugável — o restante da aplicação
 * depende de `DatabasePort`, nunca desta implementação concreta.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL')
    const adapter = new PrismaPg({ connectionString })
    super({ adapter })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
