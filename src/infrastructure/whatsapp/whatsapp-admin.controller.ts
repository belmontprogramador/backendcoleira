import {
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Roles } from '../../common/decorators/roles.decorator'
import { WhatsAppConnectionService } from './whatsapp-connection.service'

/**
 * Rotas admin de conexão WhatsApp (`/admin/whatsapp`), SUPER_ADMIN-only.
 *
 * - GET  /admin/whatsapp/connection-state → { state, instanceName }
 * - POST /admin/whatsapp/connect          → { pairingCode?, base64?, count?, instanceName }
 */
@Controller('admin/whatsapp')
@Roles('SUPER_ADMIN')
export class WhatsAppAdminController {
  constructor(private readonly connection: WhatsAppConnectionService) {}

  @Get('connection-state')
  async connectionState() {
    this.assertConfigured()
    return this.connection.state()
  }

  @Post('connect')
  async connect() {
    this.assertConfigured()
    return this.connection.connect()
  }

  private assertConfigured(): void {
    if (!this.connection.isConfigured()) {
      throw new ServiceUnavailableException(
        'WhatsApp não configurado (EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes)',
      )
    }
  }
}
