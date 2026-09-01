import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { GetTagUseCase } from '../../application/use-cases/get-tag.use-case'
import { ListTagsUseCase } from '../../application/use-cases/list-tags.use-case'
import { WriteNfcUseCase } from '../../application/use-cases/write-nfc.use-case'
import { VerifyNfcUseCase } from '../../application/use-cases/verify-nfc.use-case'
import { GenerateQrUseCase } from '../../application/use-cases/generate-qr.use-case'
import { ReportNfcWriteUseCase } from '../../application/use-cases/report-nfc-write.use-case'
import { GetNextTagToWriteUseCase } from '../../application/use-cases/get-next-tag-to-write.use-case'
import { ResetTagUseCase } from '../../application/use-cases/reset-tag.use-case'
import { MarkTagAvailableUseCase } from '../../application/use-cases/mark-tag-available.use-case'
import { ReprintCodeUseCase } from '../../application/use-cases/reprint-code.use-case'
import { NfcTagResponseMapper } from '../../application/mappers/nfc-tag-response.mapper'
import { writeNfcSchema } from '../../application/dtos/write-nfc.schema'
import type { WriteNfcDto } from '../../application/dtos/write-nfc.schema'
import { verifyNfcSchema } from '../../application/dtos/verify-nfc.schema'
import type { VerifyNfcDto } from '../../application/dtos/verify-nfc.schema'
import { listTagsSchema } from '../../application/dtos/list-tags.schema'
import type { ListTagsDto } from '../../application/dtos/list-tags.schema'
import { reportNfcWriteSchema } from '../../application/dtos/report-nfc-write.schema'
import type { ReportNfcWriteDto } from '../../application/dtos/report-nfc-write.schema'
import { nextToWriteSchema } from '../../application/dtos/next-to-write.schema'
import type { NextToWriteDto } from '../../application/dtos/next-to-write.schema'
import { Permissions } from '../../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de tags NFC (`/admin/tags`).
 *
 * ⚠️ A gravação (`write`) e verificação (`verify`) exigem `tag:record`, que é
 * EXCLUSIVO de OPERATOR (separação de funções — doc-sistema §producao-fabricacao).
 */
@Controller('admin/tags')
export class AdminTagsController {
  constructor(
    private readonly getTag: GetTagUseCase,
    private readonly listTags: ListTagsUseCase,
    private readonly writeNfc: WriteNfcUseCase,
    private readonly verifyNfc: VerifyNfcUseCase,
    private readonly generateQr: GenerateQrUseCase,
    private readonly reportNfcWrite: ReportNfcWriteUseCase,
    private readonly getNextTagToWrite: GetNextTagToWriteUseCase,
    private readonly resetTag: ResetTagUseCase,
    private readonly markTagAvailable: MarkTagAvailableUseCase,
    private readonly reprintCodeUseCase: ReprintCodeUseCase,
  ) {}

  @Get()
  @Permissions('tag:read')
  async list(@Query(new ZodValidationPipe(listTagsSchema)) query: ListTagsDto) {
    const tags = await this.listTags.execute(query)
    return tags.map(NfcTagResponseMapper.toResponse)
  }

  @Get('next-to-write')
  @Permissions('tag:record')
  async nextToWrite(
    @Query(new ZodValidationPipe(nextToWriteSchema)) query: NextToWriteDto,
  ) {
    return this.getNextTagToWrite.execute(query.batchId)
  }

  @Get(':publicId')
  @Permissions('tag:read')
  async detail(@Param('publicId') publicId: string) {
    const tag = await this.getTag.execute(publicId)
    return NfcTagResponseMapper.toResponse(tag)
  }

  @Post('write')
  @Permissions('tag:record')
  async write(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(writeNfcSchema)) body: WriteNfcDto,
  ) {
    const tag = await this.writeNfc.execute(user.sub, body.publicId, body.uid)
    return NfcTagResponseMapper.toResponse(tag)
  }

  @Post('verify')
  @Permissions('tag:record')
  async verify(
    @Body(new ZodValidationPipe(verifyNfcSchema)) body: VerifyNfcDto,
  ) {
    return this.verifyNfc.execute(body.publicId, body.uid)
  }

  @Post('report')
  @Permissions('tag:record')
  async report(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(reportNfcWriteSchema)) body: ReportNfcWriteDto,
  ) {
    const tag = await this.reportNfcWrite.execute(
      user.sub,
      body.publicId,
      body.uid,
      body.matched,
    )
    return NfcTagResponseMapper.toResponse(tag)
  }

  @Post(':publicId/reset')
  @Permissions('tag:record')
  async reset(
    @CurrentUser() user: RequestUser,
    @Param('publicId') publicId: string,
  ) {
    const tag = await this.resetTag.execute(user.sub, publicId)
    return NfcTagResponseMapper.toResponse(tag)
  }

  @Post(':publicId/mark-available')
  @Permissions('tag:write')
  async markAvailable(
    @CurrentUser() user: RequestUser,
    @Param('publicId') publicId: string,
  ) {
    const tag = await this.markTagAvailable.execute(user.sub, publicId)
    return NfcTagResponseMapper.toResponse(tag)
  }

  @Post(':publicId/reprint-code')
  @Permissions('tag:write')
  async reprintCode(
    @CurrentUser() user: RequestUser,
    @Param('publicId') publicId: string,
  ) {
    return this.reprintCodeUseCase.execute(user.sub, publicId)
  }

  @Post(':publicId/qr')
  @Permissions('tag:write')
  @HttpCode(HttpStatus.OK)
  async qr(@Param('publicId') publicId: string, @Res() res: Response) {
    const result = await this.generateQr.execute(publicId)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `inline; filename="${publicId}.png"`)
    res.send(result.png)
  }
}
