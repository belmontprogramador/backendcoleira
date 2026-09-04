import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  EvolutionApiClient,
  type EvolutionConnectionState,
  type EvolutionQrResult,
} from './evolution-api.client'

const DEFAULT_INSTANCE_NAME = 'elopet'

export interface WhatsAppConnectResult extends EvolutionQrResult {
  instanceName: string
}

export interface WhatsAppConnectionStateResult {
  state: EvolutionConnectionState
  instanceName: string
}

/**
 * Serviço de conexão da instância WhatsApp (única, do número da Elopet).
 * Usado pelo controller admin (SUPER_ADMIN) para gerar o QR e consultar o
 * estado de conexão.
 */
@Injectable()
export class WhatsAppConnectionService {
  private readonly logger = new Logger(WhatsAppConnectionService.name)

  constructor(
    private readonly client: EvolutionApiClient,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return this.client.isConfigured()
  }

  instanceName(): string {
    return this.config.get<string>('EVOLUTION_INSTANCE_NAME') ?? DEFAULT_INSTANCE_NAME
  }

  /**
   * Garante a instância (best-effort — pode já existir) e devolve o QR atual.
   */
  async connect(): Promise<WhatsAppConnectResult> {
    const name = this.instanceName()

    try {
      await this.client.createInstance(name)
    } catch (error) {
      // Reconexão: a instância pode já existir — prossegue para o QR.
      this.logger.warn(`createInstance ${name}: ${String(error)} (prosseguindo)`)
    }

    const qr = await this.client.connect(name)
    return { ...qr, instanceName: name }
  }

  async state(): Promise<WhatsAppConnectionStateResult> {
    const name = this.instanceName()
    const state = await this.client.connectionState(name)
    return { state, instanceName: name }
  }
}
