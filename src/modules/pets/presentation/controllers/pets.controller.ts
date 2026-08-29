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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { CreatePetUseCase } from '../../application/use-cases/create-pet.use-case'
import { GetPetUseCase } from '../../application/use-cases/get-pet.use-case'
import { ListUserPetsUseCase } from '../../application/use-cases/list-user-pets.use-case'
import { UpdatePetUseCase } from '../../application/use-cases/update-pet.use-case'
import { DeletePetUseCase } from '../../application/use-cases/delete-pet.use-case'
import { SetLostStatusUseCase } from '../../application/use-cases/set-lost-status.use-case'
import { UpdatePrivacyUseCase } from '../../application/use-cases/update-privacy.use-case'
import { UploadPhotoUseCase } from '../../application/use-cases/upload-photo.use-case'
import { PetResponseMapper } from '../../application/mappers/pet-response.mapper'
import { createPetSchema } from '../../application/dtos/create-pet.schema'
import type { CreatePetDto } from '../../application/dtos/create-pet.schema'
import { updatePetSchema } from '../../application/dtos/update-pet.schema'
import type { UpdatePetDto } from '../../application/dtos/update-pet.schema'
import { lostStatusSchema } from '../../application/dtos/lost-status.schema'
import type { LostStatusDto } from '../../application/dtos/lost-status.schema'
import { privacySchema } from '../../application/dtos/privacy.schema'
import type { PrivacyDto } from '../../application/dtos/privacy.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas de pets do próprio usuário autenticado (`/pets`).
 * Ownership é aplicado nos use cases (anti-IDOR).
 */
@Controller('pets')
export class PetsController {
  constructor(
    private readonly createPet: CreatePetUseCase,
    private readonly getPet: GetPetUseCase,
    private readonly listUserPets: ListUserPetsUseCase,
    private readonly updatePet: UpdatePetUseCase,
    private readonly deletePet: DeletePetUseCase,
    private readonly setLostStatus: SetLostStatusUseCase,
    private readonly updatePrivacy: UpdatePrivacyUseCase,
    private readonly uploadPhoto: UploadPhotoUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const pets = await this.listUserPets.execute(user.sub)
    return pets.map(PetResponseMapper.toResponse)
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPetSchema)) body: CreatePetDto,
  ) {
    const pet = await this.createPet.execute(user.sub, body)
    return PetResponseMapper.toResponse(pet)
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const pet = await this.getPet.execute(user.sub, id)
    return PetResponseMapper.toResponse(pet)
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePetSchema)) body: UpdatePetDto,
  ) {
    const pet = await this.updatePet.execute(user.sub, id, body)
    return PetResponseMapper.toResponse(pet)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deletePet.execute(user.sub, id)
  }

  @Post(':id/lost')
  async markLost(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const pet = await this.setLostStatus.execute(user.sub, id, true)
    return PetResponseMapper.toResponse(pet)
  }

  @Post(':id/found')
  async markFound(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const pet = await this.setLostStatus.execute(user.sub, id, false)
    return PetResponseMapper.toResponse(pet)
  }

  @Get(':id/privacy')
  async getPrivacy(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const pet = await this.getPet.execute(user.sub, id)
    return PetResponseMapper.toResponse(pet).privacy
  }

  @Patch(':id/privacy')
  async updatePrivacyRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(privacySchema)) body: PrivacyDto,
  ) {
    const pet = await this.updatePrivacy.execute(user.sub, id, body)
    return PetResponseMapper.toResponse(pet)
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhotoRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const extension = file.originalname.split('.').pop() ?? 'jpg'
    const pet = await this.uploadPhoto.execute(user.sub, id, {
      buffer: file.buffer,
      contentType: file.mimetype,
      extension,
    })
    return PetResponseMapper.toResponse(pet)
  }
}
