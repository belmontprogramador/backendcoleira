import { Body, Controller, Get, Param, Put, Res } from '@nestjs/common'
import type { Response } from 'express'
import { GetPetMedicalUseCase } from '../../application/use-cases/get-pet-medical.use-case'
import { UpsertPetMedicalUseCase } from '../../application/use-cases/upsert-pet-medical.use-case'
import { PetMedicalResponseMapper } from '../../application/mappers/pet-medical-response.mapper'
import { upsertPetMedicalSchema } from '../../application/dtos/upsert-pet-medical.schema'
import type { UpsertPetMedicalDto } from '../../application/dtos/upsert-pet-medical.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'
import { Feature } from '../../../../common/decorators/feature.decorator'

/**
 * Rotas de dados médicos do pet (feature Premium `PET_MEDICAL`).
 * Ownership é aplicado nos use cases (anti-IDOR); o gate é reforçado pelo
 * `FeatureGuard` via `@Feature`.
 */
@Controller('pets')
@Feature('PET_MEDICAL')
export class PetMedicalController {
  constructor(
    private readonly getMedical: GetPetMedicalUseCase,
    private readonly upsertMedical: UpsertPetMedicalUseCase,
  ) {}

  @Get(':petId/medical')
  async get(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Res() res: Response,
  ) {
    const medical = await this.getMedical.execute(user.sub, petId)
    return res.json(
      medical ? PetMedicalResponseMapper.toResponse(medical) : null,
    )
  }

  @Put(':petId/medical')
  async upsert(
    @CurrentUser() user: RequestUser,
    @Param('petId') petId: string,
    @Body(new ZodValidationPipe(upsertPetMedicalSchema))
    body: UpsertPetMedicalDto,
  ) {
    const medical = await this.upsertMedical.execute(user.sub, petId, body)
    return PetMedicalResponseMapper.toResponse(medical)
  }
}
