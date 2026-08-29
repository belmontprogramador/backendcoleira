import { Inject, Injectable } from '@nestjs/common'
import { FEATURE_ACCESS_PORT } from '../../../../common/ports/feature-access.port'
import type { FeatureAccessPort } from '../../../../common/ports/feature-access.port'

/**
 * Caso de uso do Feature System (RF24): verifica se um usuário possui uma
 * funcionalidade gateada por plano. Usado pelos use cases Premium como
 * defesa em profundidade (além do `FeatureGuard`).
 */
@Injectable()
export class CheckFeatureAccessUseCase {
  constructor(
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
  ) {}

  async execute(userId: string, featureCode: string): Promise<boolean> {
    return this.featureAccess.hasFeature(userId, featureCode)
  }
}
