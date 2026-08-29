import type { OnModuleDestroy } from '@nestjs/common'

/**
 * Porta do serviço de cache/Redis.
 *
 * DIP: a aplicação depende desta abstração. A implementação concreta
 * (ioredis) vive na infraestrutura e é plugável.
 */
export interface CachePort extends OnModuleDestroy {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  /** Ping — usado por health checks e verificação de conectividade. */
  ping(): Promise<string>
  /** Fecha a conexão de forma limpa. */
  quit(): Promise<void>
}

export const CACHE_PORT = Symbol('CACHE_PORT')
