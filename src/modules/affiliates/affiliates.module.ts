import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { AFFILIATE_REPOSITORY_PORT } from './domain/repositories/affiliate.repository.port'
import { COMMISSION_REPOSITORY_PORT } from './domain/repositories/commission.repository.port'
import { WITHDRAWAL_REPOSITORY_PORT } from './domain/repositories/withdrawal.repository.port'
import { AFFILIATE_COMMISSION_PORT } from '../../common/ports/affiliate-commission.port'
import { PrismaAffiliateRepository } from './infrastructure/repositories/prisma-affiliate.repository'
import { PrismaCommissionRepository } from './infrastructure/repositories/prisma-commission.repository'
import { PrismaWithdrawalRepository } from './infrastructure/repositories/prisma-withdrawal.repository'
import { AffiliateCommissionService } from './application/affiliate-commission.service'
import { CreateAffiliateUseCase } from './application/use-cases/create-affiliate.use-case'
import { UpdateAffiliateUseCase } from './application/use-cases/update-affiliate.use-case'
import { SetAffiliateStatusUseCase } from './application/use-cases/set-affiliate-status.use-case'
import { ListAffiliatesUseCase } from './application/use-cases/list-affiliates.use-case'
import { GetAffiliateUseCase } from './application/use-cases/get-affiliate.use-case'
import { GetAffiliateMetricsUseCase } from './application/use-cases/get-affiliate-metrics.use-case'
import { ListWithdrawalsUseCase } from './application/use-cases/list-withdrawals.use-case'
import { UpdateWithdrawalStatusUseCase } from './application/use-cases/update-withdrawal-status.use-case'
import { GetMyAffiliateUseCase } from './application/use-cases/get-my-affiliate.use-case'
import { UpdateMyAffiliateUseCase } from './application/use-cases/update-my-affiliate.use-case'
import { GetMyMetricsUseCase } from './application/use-cases/get-my-metrics.use-case'
import { RequestWithdrawalUseCase } from './application/use-cases/request-withdrawal.use-case'
import { ListMyWithdrawalsUseCase } from './application/use-cases/list-my-withdrawals.use-case'
import { AdminAffiliatesController } from './presentation/controllers/admin-affiliates.controller'
import { AdminWithdrawalsController } from './presentation/controllers/admin-withdrawals.controller'
import { AffiliateController } from './presentation/controllers/affiliate.controller'

/**
 * Módulo de afiliados de vendas.
 *
 * Provê as portas de persistência de `Affiliate`/`Commission`/`Withdrawal` e o
 * `AFFILIATE_COMMISSION_PORT` (transversal) para `orders` e `subscriptions`
 * atribuírem/estornarem comissão. Importa `UsersModule` para criar/associar o
 * `User` de login do afiliado.
 */
@Module({
  imports: [UsersModule],
  controllers: [
    AdminAffiliatesController,
    AdminWithdrawalsController,
    AffiliateController,
  ],
  providers: [
    PrismaAffiliateRepository,
    {
      provide: AFFILIATE_REPOSITORY_PORT,
      useClass: PrismaAffiliateRepository,
    },
    PrismaCommissionRepository,
    {
      provide: COMMISSION_REPOSITORY_PORT,
      useClass: PrismaCommissionRepository,
    },
    PrismaWithdrawalRepository,
    {
      provide: WITHDRAWAL_REPOSITORY_PORT,
      useClass: PrismaWithdrawalRepository,
    },
    AffiliateCommissionService,
    { provide: AFFILIATE_COMMISSION_PORT, useClass: AffiliateCommissionService },
    CreateAffiliateUseCase,
    UpdateAffiliateUseCase,
    SetAffiliateStatusUseCase,
    ListAffiliatesUseCase,
    GetAffiliateUseCase,
    GetAffiliateMetricsUseCase,
    ListWithdrawalsUseCase,
    UpdateWithdrawalStatusUseCase,
    GetMyAffiliateUseCase,
    UpdateMyAffiliateUseCase,
    GetMyMetricsUseCase,
    RequestWithdrawalUseCase,
    ListMyWithdrawalsUseCase,
  ],
  exports: [AFFILIATE_COMMISSION_PORT],
})
export class AffiliatesModule {}
