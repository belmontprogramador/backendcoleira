import { PlansController } from '../plans.controller'
import { ListPlansUseCase } from '../../../application/use-cases/list-plans.use-case'
import { Plan } from '../../../domain/entities/plan.entity'
import { Feature } from '../../../domain/entities/feature.entity'
import { Price } from '../../../../../common/value-objects/price.vo'

describe('PlansController', () => {
  let listPlans: jest.Mocked<ListPlansUseCase>
  let controller: PlansController

  beforeEach(() => {
    listPlans = { execute: jest.fn() } as jest.Mocked<ListPlansUseCase>
    controller = new PlansController(listPlans)
  })

  it('lista planos com features mapeadas', async () => {
    const plan = Plan.create({
      id: 'plan-1',
      code: 'PREMIUM',
      name: 'Premium',
      price: Price.create(1990),
    })
    const features = [
      Feature.create({ id: 'f-1', code: 'PET_MEDICAL', name: 'Ficha Médica' }),
    ]
    listPlans.execute.mockResolvedValue([{ plan, features }])

    const result = await controller.list()

    expect(listPlans.execute).toHaveBeenCalled()
    expect(result).toEqual([
      expect.objectContaining({
        id: 'plan-1',
        code: 'PREMIUM',
        priceCents: 1990,
        features: [{ code: 'PET_MEDICAL', name: 'Ficha Médica' }],
      }),
    ])
  })
})
