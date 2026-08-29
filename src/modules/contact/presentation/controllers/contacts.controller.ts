import { Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ListContactMessagesUseCase } from '../../application/use-cases/list-contact-messages.use-case'
import { GetContactMessageUseCase } from '../../application/use-cases/get-contact-message.use-case'
import { MarkContactMessageReadUseCase } from '../../application/use-cases/mark-contact-message-read.use-case'
import { ContactMessageResponseMapper } from '../../application/mappers/contact-message-response.mapper'
import { listContactsSchema } from '../../application/dtos/list-contacts.schema'
import type { ListContactsDto } from '../../application/dtos/list-contacts.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Inbox do tutor autenticado (doc-sistema RF14 / plano-contato-localizacao).
 * Ownership é aplicado nos use cases (anti-IDOR via `pet.ownerId === actorId`).
 */
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly listMessages: ListContactMessagesUseCase,
    private readonly getMessage: GetContactMessageUseCase,
    private readonly markRead: MarkContactMessageReadUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listContactsSchema)) query: ListContactsDto,
  ) {
    const messages = await this.listMessages.execute({
      actorId: user.sub,
      petId: query.petId,
      page: query.page,
      limit: query.limit,
    })
    return messages.map(ContactMessageResponseMapper.toResponse)
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const message = await this.getMessage.execute(user.sub, id)
    return ContactMessageResponseMapper.toResponse(message)
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const message = await this.markRead.execute(user.sub, id)
    return ContactMessageResponseMapper.toResponse(message)
  }
}
