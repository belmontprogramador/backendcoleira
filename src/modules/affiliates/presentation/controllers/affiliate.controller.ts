import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { GetMyAffiliateUseCase } from '../../application/use-cases/get-my-affiliate.use-case'
import { UpdateMyAffiliateUseCase } from '../../application/use-cases/update-my-affiliate.use-case'
import { GetMyMetricsUseCase } from '../../application/use-cases/get-my-metrics.use-case'
import { RequestWithdrawalUseCase } from '../../application/use-cases/request-withdrawal.use-case'
import { ListMyWithdrawalsUseCase } from '../../application/use-cases/list-my-withdrawals.use-case'
import { AffiliateResponseMapper } from '../../application/mappers/affiliate-response.mapper'
import { WithdrawalResponseMapper } from '../../application/mappers/withdrawal-response.mapper'
import { updateMyAffiliateSchema } from '../../application/dtos/update-my-affiliate.schema'
import type { UpdateMyAffiliateDto } from '../../application/dtos/update-my-affiliate.schema'
import { requestWithdrawalSchema } from '../../application/dtos/request-withdrawal.schema'
import type { RequestWithdrawalDto } from '../../application/dtos/request-withdrawal.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas da área do afiliado (`/affiliate/me`).
 * Exigem JWT + vínculo `Affiliate` ativo (validado nos use cases).
 */
@Controller('affiliate/me')
export class AffiliateController {
  constructor(
    private readonly getMyUseCase: GetMyAffiliateUseCase,
    private readonly updateMyUseCase: UpdateMyAffiliateUseCase,
    private readonly myMetricsUseCase: GetMyMetricsUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
    private readonly listMyWithdrawalsUseCase: ListMyWithdrawalsUseCase,
  ) {}

  @Get()
  async getMe(@CurrentUser() user: RequestUser) {
    const affiliate = await this.getMyUseCase.execute(user.sub)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Patch()
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateMyAffiliateSchema))
    body: UpdateMyAffiliateDto,
  ) {
    const affiliate = await this.updateMyUseCase.execute(user.sub, body)
    return AffiliateResponseMapper.toResponse(affiliate)
  }

  @Get('metrics')
  async myMetrics(@CurrentUser() user: RequestUser) {
    return this.myMetricsUseCase.execute(user.sub)
  }

  @Post('withdrawals')
  async requestWithdrawal(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(requestWithdrawalSchema))
    body: RequestWithdrawalDto,
  ) {
    const withdrawal = await this.requestWithdrawalUseCase.execute(
      user.sub,
      body,
    )
    return WithdrawalResponseMapper.toResponse(withdrawal)
  }

  @Get('withdrawals')
  async myWithdrawals(@CurrentUser() user: RequestUser) {
    const withdrawals = await this.listMyWithdrawalsUseCase.execute(user.sub)
    return withdrawals.map(WithdrawalResponseMapper.toResponse)
  }
}
