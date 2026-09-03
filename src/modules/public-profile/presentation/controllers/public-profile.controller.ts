import {
  Controller,
  Get,
  Headers,
  Inject,
  Ip,
  Param,
  Query,
} from '@nestjs/common'
import { GetPublicProfileUseCase } from '../../application/use-cases/get-public-profile.use-case'
import { PublicProfileResponseMapper } from '../../application/mappers/public-profile-response.mapper'
import { publicIdParamSchema } from '../../application/dtos/public-id-param.schema'
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
    @Inject(IP_HASHER_PORT) private readonly ipHasher: IpHasherPort,
  ) {}

  @Public()
  @Get(':publicId')
  async get(
    @Param('publicId', new ZodValidationPipe(publicIdParamSchema))
    publicId: string,
    @Query('source') source?: string,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ReturnType<typeof PublicProfileResponseMapper.toResponse>> {
    const result = await this.getPublicProfile.execute({
      publicId,
      source: parseAccessSource(source),
      ip: ip ?? null,
      ipHash: this.ipHasher.hash(ip),
      deviceType: userAgent ?? null,
    })
    return PublicProfileResponseMapper.toResponse(result)
  }
}
