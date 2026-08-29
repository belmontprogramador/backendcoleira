import { Global, Module } from '@nestjs/common'
import { DATABASE_PORT } from '../../common/ports/database.port'
import { PrismaService } from './prisma.service'

/**
 * Provê a implementação concreta do banco (Prisma 7) atrás da porta
 * `DATABASE_PORT`. Global para que qualquer módulo dependa da abstração
 * sem re-declarar a infraestrutura.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: DATABASE_PORT, useExisting: PrismaService },
  ],
  exports: [DATABASE_PORT, PrismaService],
})
export class DatabaseModule {}
