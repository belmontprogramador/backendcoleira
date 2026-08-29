import { Controller, Get, Param } from '@nestjs/common'
import { ListAccessEventsUseCase } from '../../application/use-cases/list-access-events.use-case'
import { AccessEventResponseMapper } from '../../application/mappers/access-event-response.mapper'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { Feature } from '../../../../common/decorators/feature.decorator'

/**
 * Rota de histórico de acessos do pet (feature Premium `ACCESS_HISTORY`).
 * Ownership é aplicado no use case (anti-IDOR); o gate é reforçado pelo
 * `FeatureGuard` via `@Feature`.
 */
@Controller('pets')
@Feature('ACCESS_HISTORY')
export class AccessEventsController {
  constructor(private readonly listAccessEvents: ListAccessEventsUseCase) {}

  @Get(':petId/access-events')
  async list(@CurrentUser() user: RequestUser, @Param('petId') petId: string) {
    const events = await this.listAccessEvents.execute(user.sub, petId)
    return events.map(AccessEventResponseMapper.toResponse)
  }
}
