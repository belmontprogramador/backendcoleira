import { Controller, Get, Param, Query } from '@nestjs/common'
import { ListAllPetsUseCase } from '../../application/use-cases/list-all-pets.use-case'
import { AdminGetPetUseCase } from '../../application/use-cases/admin-get-pet.use-case'
import { AdminPetResponseAssembler } from '../../application/assemblers/admin-pet-response.assembler'
import { listPetsSchema } from '../../application/dtos/list-pets.schema'
import type { ListPetsDto } from '../../application/dtos/list-pets.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de pets (`/admin/pets`).
 * Requer ADMIN+. Sem hard delete (doc-sistema §43 manda soft delete).
 */
@Controller('admin/pets')
@Roles('ADMIN')
export class AdminPetsController {
  constructor(
    private readonly listAllPets: ListAllPetsUseCase,
    private readonly adminGetPet: AdminGetPetUseCase,
    private readonly assembler: AdminPetResponseAssembler,
  ) {}

  @Get()
  async list(@Query(new ZodValidationPipe(listPetsSchema)) query: ListPetsDto) {
    const pets = await this.listAllPets.execute(query)
    return this.assembler.toResponses(pets)
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const pet = await this.adminGetPet.execute(id)
    return this.assembler.toResponse(pet)
  }
}
