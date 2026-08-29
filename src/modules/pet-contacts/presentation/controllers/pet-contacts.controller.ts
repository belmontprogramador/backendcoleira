import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ListPetContactsUseCase } from '../../application/use-cases/list-pet-contacts.use-case'
import { CreatePetContactUseCase } from '../../application/use-cases/create-pet-contact.use-case'
import { UpdatePetContactUseCase } from '../../application/use-cases/update-pet-contact.use-case'
import { DeletePetContactUseCase } from '../../application/use-cases/delete-pet-contact.use-case'
import { PetContactResponseMapper } from '../../application/mappers/pet-contact-response.mapper'
import { createPetContactSchema } from '../../application/dtos/create-pet-contact.schema'
import type { CreatePetContactDto } from '../../application/dtos/create-pet-contact.schema'
import { updatePetContactSchema } from '../../application/dtos/update-pet-contact.schema'
import type { UpdatePetContactDto } from '../../application/dtos/update-pet-contact.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'
import { Feature } from '../../../../common/decorators/feature.decorator'

/**
 * Rotas de contatos do pet (feature Premium `MULTIPLE_CONTACTS`).
 * Ownership é aplicado nos use cases (anti-IDOR); o gate é reforçado pelo
 * `FeatureGuard` via `@Feature`.
 */
@Controller('pets')
@Feature('MULTIPLE_CONTACTS')
export class PetContactsController {
  constructor(
    private readonly listContacts: ListPetContactsUseCase,
    private readonly createContact: CreatePetContactUseCase,
    private readonly updateContact: UpdatePetContactUseCase,
    private readonly deleteContact: DeletePetContactUseCase,
  ) {}

  @Get(':petId/contacts')
  async list(@CurrentUser() user: RequestUser, @Param('petId') petId: string) {
    const contacts = await this.listContacts.execute(user.sub, petId)
    return contacts.map(PetContactResponseMapper.toResponse)
  }

  @Post(':petId/contacts')
  async create(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Body(new ZodValidationPipe(createPetContactSchema))
    body: CreatePetContactDto,
  ) {
    const contact = await this.createContact.execute(user.sub, petId, body)
    return PetContactResponseMapper.toResponse(contact)
  }

  @Patch(':petId/contacts/:id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePetContactSchema))
    body: UpdatePetContactDto,
  ) {
    const contact = await this.updateContact.execute(user.sub, petId, id, body)
    return PetContactResponseMapper.toResponse(contact)
  }

  @Delete(':petId/contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteContact.execute(user.sub, petId, id)
  }
}
