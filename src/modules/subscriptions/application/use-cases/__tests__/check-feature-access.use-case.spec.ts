import { CheckFeatureAccessUseCase } from '../check-feature-access.use-case'
import type { FeatureAccessPort } from '../../../../../common/ports/feature-access.port'

describe('CheckFeatureAccessUseCase', () => {
  let featureAccess: jest.Mocked<FeatureAccessPort>

  beforeEach(() => {
    featureAccess = { hasFeature: jest.fn(), listFeatures: jest.fn() }
  })

  it('delega a verificação à porta e retorna true', async () => {
    featureAccess.hasFeature.mockResolvedValue(true)
    const useCase = new CheckFeatureAccessUseCase(featureAccess)

    await expect(useCase.execute('user-1', 'PET_MEDICAL')).resolves.toBe(true)
    expect(featureAccess.hasFeature).toHaveBeenCalledWith(
      'user-1',
      'PET_MEDICAL',
    )
  })

  it('retorna false quando a feature não está disponível', async () => {
    featureAccess.hasFeature.mockResolvedValue(false)
    const useCase = new CheckFeatureAccessUseCase(featureAccess)

    await expect(useCase.execute('user-1', 'PET_MEDICAL')).resolves.toBe(false)
  })
})
