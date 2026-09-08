import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ListWithdrawalsUseCase } from '../../application/use-cases/list-withdrawals.use-case'
import { UpdateWithdrawalStatusUseCase } from '../../application/use-cases/update-withdrawal-status.use-case'
import { WithdrawalResponseMapper } from '../../application/mappers/withdrawal-response.mapper'
import { listWithdrawalsSchema } from '../../application/dtos/list-withdrawals.schema'
import type { ListWithdrawalsDto } from '../../application/dtos/list-withdrawals.schema'
import { updateWithdrawalStatusSchema } from '../../application/dtos/update-withdrawal-status.schema'
import type { UpdateWithdrawalStatusDto } from '../../application/dtos/update-withdrawal-status.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de saques (`/admin/withdrawals`). Requerem ADMIN.
 */
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(
    private readonly listUseCase: ListWithdrawalsUseCase,
    private readonly updateStatusUseCase: UpdateWithdrawalStatusUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  async list(
    @Query(new ZodValidationPipe(listWithdrawalsSchema))
    query: ListWithdrawalsDto,
  ) {
    const { data, total, page, limit } = await this.listUseCase.execute(query)
    return {
      data: data.map(WithdrawalResponseMapper.toResponse),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWithdrawalStatusSchema))
    body: UpdateWithdrawalStatusDto,
  ) {
    const withdrawal = await this.updateStatusUseCase.execute(id, body.status)
    return WithdrawalResponseMapper.toResponse(withdrawal)
  }
}
