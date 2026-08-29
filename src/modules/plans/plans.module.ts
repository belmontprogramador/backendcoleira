import { Module } from '@nestjs/common'
import { PLAN_REPOSITORY_PORT } from './domain/repositories/plan.repository.port'
import { FEATURE_REPOSITORY_PORT } from './domain/repositories/feature.repository.port'
import { PrismaPlanRepository } from './infrastructure/repositories/prisma-plan.repository'
import { PrismaFeatureRepository } from './infrastructure/repositories/prisma-feature.repository'
import { ListPlansUseCase } from './application/use-cases/list-plans.use-case'
import { PlansController } from './presentation/controllers/plans.controller'

/**
 * Módulo de planos (catálogo Basic/Premium + Feature System).
 * Provê as implementações concretas atrás das portas (DIP) e exporta as
 * portas/use cases para consumo por outros módulos.
 */
@Module({
  controllers: [PlansController],
  providers: [
    PrismaPlanRepository,
    { provide: PLAN_REPOSITORY_PORT, useClass: PrismaPlanRepository },
    PrismaFeatureRepository,
    { provide: FEATURE_REPOSITORY_PORT, useClass: PrismaFeatureRepository },
    ListPlansUseCase,
  ],
  exports: [PLAN_REPOSITORY_PORT, FEATURE_REPOSITORY_PORT, ListPlansUseCase],
})
export class PlansModule {}
