import { AdminPlansController } from '../admin-plans.controller'
import { UpdatePlanUseCase } from '../../../application/use-cases/update-plan.use-case'
import { Plan } from '../../../domain/entities/plan.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('AdminPlansController', () => {
  let updatePlan: jest.Mocked<UpdatePlanUseCase>
  let controller: AdminPlansController

  beforeEach(() => {
    updatePlan = { execute: jest.fn() } as jest.Mocked<UpdatePlanUseCase>
    controller = new AdminPlansController(updatePlan)
  })

  it('atualiza plano e retorna a resposta mapeada', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(2990),
    })
    updatePlan.execute.mockResolvedValue({ plan, features: [] })

    const result = await controller.update('plan-1', { priceCents: 2990 })

    expect(updatePlan.execute).toHaveBeenCalledWith('plan-1', {
      priceCents: 2990,
    })
    expect(result).toEqual(
      expect.objectContaining({
        id: 'plan-1',
        code: 'PREMIUM',
        priceCents: 2990,
      }),
    )
  })
})
