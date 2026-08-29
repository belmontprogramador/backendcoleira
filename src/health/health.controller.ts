import { Controller, Get, Inject } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus'
import { Public } from '../common/decorators/public.decorator'
import { CACHE_PORT } from '../common/ports/cache.port'
import type { CachePort } from '../common/ports/cache.port'
import { DATABASE_PORT } from '../common/ports/database.port'
import type { DatabasePort } from '../common/ports/database.port'

/**
 * Health check HTTP.
 *
 * Depende apenas das portas (`DatabasePort` e `CachePort`), nunca das
 * implementações concretas — respeitando DIP.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DATABASE_PORT) private readonly db: DatabasePort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkCache(),
    ])
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    const t0 = Date.now()
    await this.db.$queryRawUnsafe('SELECT 1')
    return {
      database: {
        status: 'up',
        latencyMs: Date.now() - t0,
      },
    }
  }

  private async checkCache(): Promise<HealthIndicatorResult> {
    const pong = await this.cache.ping()
    return {
      cache: {
        status: pong === 'PONG' ? 'up' : 'down',
      },
    }
  }
}
