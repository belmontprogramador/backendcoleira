import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { AdminGetUserPlanUseCase } from '../../application/use-cases/admin-get-user-plan.use-case'
import { ListSubscriptionsUseCase } from '../../application/use-cases/list-subscriptions.use-case'
import { AdminCancelSubscriptionUseCase } from '../../application/use-cases/admin-cancel-subscription.use-case'
import { AdminUserPlanResponseMapper } from '../../application/mappers/admin-user-plan-response.mapper'
import { AdminSubscriptionResponseAssembler } from '../../application/assemblers/admin-subscription-response.assembler'
import { listSubscriptionsSchema } from '../../application/dtos/list-subscriptions.schema'
import type { ListSubscriptionsDto } from '../../application/dtos/list-subscriptions.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de assinatura (`/admin/subscriptions`).
 *
 * - `GET /admin/subscriptions` → lista paginada + filtros (status/planCode/userId).
 * - `GET /admin/subscriptions/:userId` → plano ativo + assinatura de um usuário
 *   (para a tela de detalhe do cliente: "Free vs Premium").
 * - `POST /admin/subscriptions/:userId/cancel` → cancelamento administrativo.
 */
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(
    private readonly getPlan: AdminGetUserPlanUseCase,
    private readonly listSubscriptions: ListSubscriptionsUseCase,
    private readonly adminCancel: AdminCancelSubscriptionUseCase,
    private readonly assembler: AdminSubscriptionResponseAssembler,
  ) {}

  @Get()
  @Roles('ADMIN')
  async list(
    @Query(new ZodValidationPipe(listSubscriptionsSchema))
    query: ListSubscriptionsDto,
  ) {
    const { data, total, page, limit } =
      await this.listSubscriptions.execute(query)
    const items = await this.assembler.toResponses(data)
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  @Get(':userId')
  @Roles('ADMIN')
  async get(@Param('userId') userId: string) {
    const result = await this.getPlan.execute(userId)
    return AdminUserPlanResponseMapper.toResponse(result)
  }

  @Post(':userId/cancel')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.adminCancel.execute(user.roles ?? [], userId)
  }
}
