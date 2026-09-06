import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
  Query,
  Res,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
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
 *   tokens e persiste a credencial única. Quando `FRONT_ADMIN_URL` está
 *   configurada, redireciona de volta ao painel com `?shipping=connected|error`.
 * - `GET /admin/shipping/oauth/status` (SUPER_ADMIN) — `{ connected }`.
 * - `DELETE /admin/shipping/oauth/disconnect` (SUPER_ADMIN) — apaga a
 *   credencial (desconecta a conta).
 */
@Controller()
export class ShippingOAuthController {
  private readonly logger = new Logger(ShippingOAuthController.name)

  constructor(
    private readonly oauth: ShippingOAuthService,
    private readonly config: ConfigService,
  ) {}

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
  async callback(
    @Query('code') code: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const frontAdmin = (this.config.get<string>('FRONT_ADMIN_URL') ?? '')
      .trim()
      .replace(/\/+$/, '')

    const redirectToPanel = (status: 'connected' | 'error'): boolean => {
      if (!frontAdmin) return false
      res.redirect(`${frontAdmin}/dashboard/admin?shipping=${status}`)
      return true
    }

    if (!code) {
      if (redirectToPanel('error')) return
      res
        .status(400)
        .json({ statusCode: 400, message: 'Código OAuth ausente' })
      return
    }

    try {
      await this.oauth.callback(code)
    } catch (error) {
      this.logger.error(
        `Falha no callback OAuth da Melhor Envio: ${String(error)}`,
      )
      if (redirectToPanel('error')) return
      res
        .status(502)
        .json({ statusCode: 502, message: 'Falha ao conectar a Melhor Envio' })
      return
    }

    this.logger.log('Conta Melhor Envio conectada com sucesso')
    if (redirectToPanel('connected')) return
    res.status(200).json({ connected: true })
  }

  @Roles('SUPER_ADMIN')
  @Get('admin/shipping/oauth/status')
  async status(): Promise<{ connected: boolean }> {
    return { connected: await this.oauth.isConnected() }
  }

  @Roles('SUPER_ADMIN')
  @Delete('admin/shipping/oauth/disconnect')
  async disconnect(): Promise<{ disconnected: true }> {
    await this.oauth.disconnect()
    return { disconnected: true }
  }
}
