import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FEATURES_KEY } from '../decorators/feature.decorator'
import { FEATURE_ACCESS_PORT } from '../ports/feature-access.port'
import type { FeatureAccessPort } from '../ports/feature-access.port'

interface AuthedRequest {
  user?: { sub: string }
}

/**
 * Guard do Feature System (D6).
 *
 * Age somente quando a rota tem `@Feature(...)`. Verifica via `FeatureAccessPort`
 * se o usuário possui a(s) feature(s); sem acesso → 403 `FEATURE_NOT_AVAILABLE`
 * (doc-sistema `seguranca §4`).
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FEATURE_ACCESS_PORT)
    private readonly featureAccess: FeatureAccessPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>()
    const user = request.user

    if (!user?.sub) {
      throw new ForbiddenException('FEATURE_NOT_AVAILABLE')
    }

    for (const feature of requiredFeatures) {
      const has = await this.featureAccess.hasFeature(user.sub, feature)
      if (!has) {
        throw new ForbiddenException('FEATURE_NOT_AVAILABLE')
      }
    }

    return true
  }
}
