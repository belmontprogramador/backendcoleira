import { Body, Controller, Param, Patch } from '@nestjs/common'
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.use-case'
import { PlanResponseMapper } from '../../application/mappers/plan-response.mapper'
import { updatePlanSchema } from '../../application/dtos/update-plan.schema'
import type { UpdatePlanDto } from '../../application/dtos/update-plan.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de planos (`/admin/plans`).
 *
 * - `PATCH /admin/plans/:id` — atualiza nome/descrição/preço de um plano.
 *   Requer SUPER_ADMIN (preço é sensível).
 */
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly updatePlan: UpdatePlanUseCase) {}

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanDto,
  ) {
    const { plan, features } = await this.updatePlan.execute(id, body)
    return PlanResponseMapper.toResponse(plan, features)
  }
}
