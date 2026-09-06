import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
} from '@nestjs/common'
import { ShippingOAuthService } from './shipping-oauth.service'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'

/**
 * Rotas do OAuth da Melhor Envio (Authorization Code).
 *
 * - `GET /admin/shipping/oauth/authorize` (SUPER_ADMIN) — devolve a URL de
 *   autorização (`{ url }`) para o painel navegar. O painel é um static export
 *   (Cloudflare Pages) e não tem rota de servidor para resolver redirect com
 *   `Authorization: Bearer`; por isso retornamos a URL em JSON e o client
 *   navega via `window.location`.
 * - `GET /api/shipping/oauth/callback` (público) — recebe o `code`, troca por
 *   tokens e persiste a credencial única.
 */
@Controller()
export class ShippingOAuthController {
  private readonly logger = new Logger(ShippingOAuthController.name)

  constructor(private readonly oauth: ShippingOAuthService) {}

  @Roles('SUPER_ADMIN')
  @Get('admin/shipping/oauth/authorize')
  authorize(): { url: string } {
    const url = this.oauth.authorize()
    if (!url) {
      throw new BadRequestException(
        'Melhor Envio não configurada (MELHOR_ENVIO_CLIENT_ID/SECRET/BASE_URL ausentes)',
      )
    }
    this.logger.log('Gerando URL de autorização OAuth da Melhor Envio')
    return { url }
  }

  @Public()
  @Get('api/shipping/oauth/callback')
  async callback(@Query('code') code?: string) {
    if (!code) {
      throw new BadRequestException('Código OAuth ausente')
    }
    await this.oauth.callback(code)
    return { connected: true }
  }
}
