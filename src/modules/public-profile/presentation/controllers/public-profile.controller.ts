import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Ip,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { GetPublicProfileUseCase } from '../../application/use-cases/get-public-profile.use-case'
import { ReportAccessLocationUseCase } from '../../application/use-cases/report-access-location.use-case'
import { PublicProfileResponseMapper } from '../../application/mappers/public-profile-response.mapper'
import { publicIdParamSchema } from '../../application/dtos/public-id-param.schema'
import {
  reportAccessLocationSchema,
  type ReportAccessLocationDto,
} from '../../application/dtos/report-access-location.schema'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'
import { Public } from '../../../../common/decorators/public.decorator'
import { parseAccessSource } from '../../../../common/constants/access-source'
import { IP_HASHER_PORT } from '../../../../common/ports/ip-hasher.port'
import type { IpHasherPort } from '../../../../common/ports/ip-hasher.port'

/**
 * Rota pública do perfil do pet (doc-sistema §perfil-privacidade /
 * plano-perfil-publico). Acessada via NFC/QR por qualquer pessoa, sem login
 * (`@Public()`). O public ID não é credencial — validação de formato via Zod.
 *
 * O acesso é registrado (RF18) via `?source=nfc|qr` + IP hash + User-Agent.
 */
@Controller('p')
export class PublicProfileController {
  constructor(
    private readonly getPublicProfile: GetPublicProfileUseCase,
    private readonly reportAccessLocation: ReportAccessLocationUseCase,
    @Inject(IP_HASHER_PORT) private readonly ipHasher: IpHasherPort,
  ) {}

  @Public()
  @Get(':publicId')
  async get(
    @Param('publicId', new ZodValidationPipe(publicIdParamSchema))
    publicId: string,
    @Query('source') source?: string,
    @Ip() ip?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ReturnType<typeof PublicProfileResponseMapper.toResponse>> {
    // O BFF (frontclient) proxeia o request e repassa o IP real do visitante
    // via X-Forwarded-For; sem isso o backend veria o IP do proxy (privado)
    // e a geolocalização falharia.
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip
    const result = await this.getPublicProfile.execute({
      publicId,
      source: parseAccessSource(source),
      ip: clientIp ?? null,
      ipHash: this.ipHasher.hash(clientIp),
      deviceType: userAgent ?? null,
    })
    return PublicProfileResponseMapper.toResponse(result)
  }

  @Public()
  @Post(':publicId/location')
  async reportLocation(
    @Param('publicId', new ZodValidationPipe(publicIdParamSchema))
    publicId: string,
    @Body(new ZodValidationPipe(reportAccessLocationSchema))
    body: ReportAccessLocationDto,
  ): Promise<{ ok: true }> {
    await this.reportAccessLocation.execute({
      publicId,
      accessId: body.access_id,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    })
    return { ok: true }
  }
}
