import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { ShippingOAuthService } from './shipping-oauth.service'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'

/**
 * Rotas do OAuth da Melhor Envio (Authorization Code).
 *
 * - `GET /admin/shipping/oauth/authorize` (SUPER_ADMIN) — redireciona o
 *   navegador para a autorização da ME.
 * - `GET /api/shipping/oauth/callback` (público) — recebe o `code`, troca por
 *   tokens e persiste a credencial única.
 */
@Controller()
export class ShippingOAuthController {
  private readonly logger = new Logger(ShippingOAuthController.name)

  constructor(private readonly oauth: ShippingOAuthService) {}

  @Roles('SUPER_ADMIN')
  @Get('admin/shipping/oauth/authorize')
  async authorize(@Res() res: Response): Promise<void> {
    const url = this.oauth.authorize()
    if (!url) {
      throw new BadRequestException(
        'Melhor Envio não configurada (MELHOR_ENVIO_CLIENT_ID/SECRET/BASE_URL ausentes)',
      )
    }
    this.logger.log('Redirecionando para autorização OAuth da Melhor Envio')
    res.redirect(url)
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
