import { Controller, Get } from '@nestjs/common'
import { ListPlansUseCase } from '../../application/use-cases/list-plans.use-case'
import { PlanResponseMapper } from '../../application/mappers/plan-response.mapper'

/**
 * Rota pública de catálogo de planos (`GET /plans`).
 * Retorna Basic + Premium com suas features (Feature System).
 */
@Controller('plans')
export class PlansController {
  constructor(private readonly listPlans: ListPlansUseCase) {}

  @Get()
  async list() {
    const result = await this.listPlans.execute()
    return result.map(({ plan, features }) =>
      PlanResponseMapper.toResponse(plan, features),
    )
  }
}
