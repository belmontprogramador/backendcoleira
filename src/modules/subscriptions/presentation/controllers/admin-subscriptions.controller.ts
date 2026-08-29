import { Controller, Get, Param } from '@nestjs/common'
import { AdminGetUserPlanUseCase } from '../../application/use-cases/admin-get-user-plan.use-case'
import { AdminUserPlanResponseMapper } from '../../application/mappers/admin-user-plan-response.mapper'
import { Roles } from '../../../../common/decorators/roles.decorator'

/**
 * Rotas administrativas de assinatura (`/admin/subscriptions`).
 * `GET /admin/subscriptions/:userId` → plano ativo + assinatura de um usuário
 * (para a tela de detalhe do cliente: "Free vs Premium").
 */
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly getPlan: AdminGetUserPlanUseCase) {}

  @Get(':userId')
  @Roles('ADMIN')
  async get(@Param('userId') userId: string) {
    const result = await this.getPlan.execute(userId)
    return AdminUserPlanResponseMapper.toResponse(result)
  }
}
