import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ActivateTagUseCase } from '../../application/use-cases/activate-tag.use-case'
import { ActivateTagByCodeUseCase } from '../../application/use-cases/activate-tag-by-code.use-case'
import { AssociatePetUseCase } from '../../application/use-cases/associate-pet.use-case'
import { DisassociatePetUseCase } from '../../application/use-cases/disassociate-pet.use-case'
import { RequestTransferUseCase } from '../../application/use-cases/request-transfer.use-case'
import { AcceptTransferUseCase } from '../../application/use-cases/accept-transfer.use-case'
import { UnlinkTagUseCase } from '../../application/use-cases/unlink-tag.use-case'
import { ReplaceTagUseCase } from '../../application/use-cases/replace-tag.use-case'
import { GetTagUseCase } from '../../../nfc/application/use-cases/get-tag.use-case'
import { OwnershipTagResponseMapper } from '../../application/mappers/ownership-tag-response.mapper'
import { activateTagSchema } from '../../application/dtos/activate-tag.schema'
import type { ActivateTagDto } from '../../application/dtos/activate-tag.schema'
import { activateByCodeSchema } from '../../application/dtos/activate-by-code.schema'
import type { ActivateByCodeDto } from '../../application/dtos/activate-by-code.schema'
import { associatePetSchema } from '../../application/dtos/associate-pet.schema'
import type { AssociatePetDto } from '../../application/dtos/associate-pet.schema'
import { requestTransferSchema } from '../../application/dtos/request-transfer.schema'
import type { RequestTransferDto } from '../../application/dtos/request-transfer.schema'
import { acceptTransferSchema } from '../../application/dtos/accept-transfer.schema'
import type { AcceptTransferDto } from '../../application/dtos/accept-transfer.schema'
import { replaceTagSchema } from '../../application/dtos/replace-tag.schema'
import type { ReplaceTagDto } from '../../application/dtos/replace-tag.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { Public } from '../../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas de ativação e ownership (`/nfc` — doc-sistema §apis §2).
 * Ativação é pública (login no body); demais operações exigem autenticação.
 */
@Controller('nfc')
export class OwnershipController {
  constructor(
    private readonly activateTag: ActivateTagUseCase,
    private readonly activateTagByCode: ActivateTagByCodeUseCase,
    private readonly getTag: GetTagUseCase,
    private readonly associatePet: AssociatePetUseCase,
    private readonly disassociatePet: DisassociatePetUseCase,
    private readonly requestTransfer: RequestTransferUseCase,
    private readonly acceptTransfer: AcceptTransferUseCase,
    private readonly unlinkTag: UnlinkTagUseCase,
    private readonly replaceTag: ReplaceTagUseCase,
  ) {}

  /** Status do pingente (público — o Public ID não é credencial). */
  @Public()
  @Get(':publicId')
  async status(@Param('publicId') publicId: string) {
    const tag = await this.getTag.execute(publicId)
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':publicId/activate')
  async activate(
    @CurrentUser() user: RequestUser,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(activateTagSchema)) body: ActivateTagDto,
  ) {
    const tag = await this.activateTag.execute(
      user.sub,
      publicId,
      body.activationCode,
    )
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post('activate-by-code')
  async activateByCode(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(activateByCodeSchema)) body: ActivateByCodeDto,
  ) {
    const tag = await this.activateTagByCode.execute(
      user.sub,
      body.activationCode,
      body.petId,
    )
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':id/associate-pet')
  async associatePetRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(associatePetSchema)) body: AssociatePetDto,
  ) {
    const tag = await this.associatePet.execute(user.sub, id, body.petId)
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':id/disassociate-pet')
  async disassociatePetRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tag = await this.disassociatePet.execute(user.sub, id)
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':id/transfer')
  async requestTransferRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(requestTransferSchema))
    body: RequestTransferDto,
  ) {
    return this.requestTransfer.execute(user.sub, id, body.toEmail)
  }

  @Post('transfer/accept')
  async acceptTransferRoute(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(acceptTransferSchema))
    body: AcceptTransferDto,
  ) {
    const tag = await this.acceptTransfer.execute(user.sub, body.token)
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':id/unlink')
  async unlinkRoute(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const tag = await this.unlinkTag.execute(user.sub, id)
    return OwnershipTagResponseMapper.toResponse(tag)
  }

  @Post(':id/replace')
  async replaceRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replaceTagSchema)) body: ReplaceTagDto,
  ) {
    const tag = await this.replaceTag.execute(user.sub, id, body.newTagId)
    return OwnershipTagResponseMapper.toResponse(tag)
  }
}
