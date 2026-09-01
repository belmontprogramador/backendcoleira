import {
  Body,
  Controller,
  Headers,
  Inject,
  Ip,
  Param,
  Post,
} from '@nestjs/common'
import { SendContactMessageUseCase } from '../../application/use-cases/send-contact-message.use-case'
import { contactSchema } from '../../application/dtos/contact.schema'
import type { ContactDto } from '../../application/dtos/contact.schema'
import { publicIdParamSchema } from '../../../public-profile/application/dtos/public-id-param.schema'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'
import { Public } from '../../../../common/decorators/public.decorator'
import { parseAccessSource } from '../../../../common/constants/access-source'
import { IP_HASHER_PORT } from '../../../../common/ports/ip-hasher.port'
import type { IpHasherPort } from '../../../../common/ports/ip-hasher.port'

/**
 * Rota pública de contato (doc-sistema RF14 / plano-contato-localizacao).
 * `POST /p/:publicId/contact` — visitante envia mensagem ao tutor, sem login
 * (`@Public()`). Nunca expõe dados do tutor; retorna apenas `{ messageId }`.
 *
 * Rate limit dedicado (configurado no `RateLimitModule`):
 *   - `contact-ip`        → 5/hora por IP (anti-spam do remetente);
 *   - `contact-publicId`  → 10/hora por publicId (anti-flood do tutor alvo).
 * Ambos só ativam nesta rota (`skipIf` seletivo no config global).
 */
@Controller('p')
export class ContactController {
  constructor(
    private readonly sendContactMessage: SendContactMessageUseCase,
    @Inject(IP_HASHER_PORT) private readonly ipHasher: IpHasherPort,
  ) {}

  @Public()
  @Post(':publicId/contact')
  async send(
    @Param('publicId', new ZodValidationPipe(publicIdParamSchema))
    publicId: string,
    @Body(new ZodValidationPipe(contactSchema)) body: ContactDto,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<{ messageId: string }> {
    return this.sendContactMessage.execute({
      publicId,
      senderName: body.sender_name ?? null,
      senderPhone: body.sender_phone ?? null,
      senderEmail: body.sender_email ?? null,
      message: body.message,
      source: parseAccessSource(body.source),
      ip: ip ?? null,
      ipHash: this.ipHasher.hash(ip),
      userAgent: userAgent ?? null,
    })
  }
}
