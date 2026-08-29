import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'

/**
 * Porta do serviço de banco de dados.
 *
 * O domínio e a aplicação dependem desta abstração — nunca de uma
 * implementação concreta do Prisma. A infraestrutura (Prisma 7 + driver
 * adapter) implementa esta porta e é plugável.
 *
 * DIP: dependemos de abstrações, não de implementações.
 */
export interface DatabasePort extends OnModuleInit, OnModuleDestroy {
  /** Executa uma query raw e retorna o número de linhas afetadas. */
  $executeRaw(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<number>
  /** Executa uma query raw de leitura. */
  $queryRaw<T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>
  /** Verifica conectividade com o banco. */
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>
  /** Fecha a conexão de forma limpa. */
  $disconnect(): Promise<void>
}

export const DATABASE_PORT = Symbol('DATABASE_PORT')
