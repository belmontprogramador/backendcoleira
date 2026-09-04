import { Logger } from '@nestjs/common'

export interface EvolutionQrResult {
  pairingCode?: string
  code?: string
  base64?: string
  count?: number
}

export type EvolutionConnectionState =
  | 'open'
  | 'connecting'
  | 'close'
  | 'refused'
  | 'unknown'

export class EvolutionApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvolutionApiError'
  }
}

/** A Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes). */
export class EvolutionNotConfiguredError extends EvolutionApiError {
  constructor() {
    super(
      'Evolution API não configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes)',
    )
    this.name = 'EvolutionNotConfiguredError'
  }
}

interface ConnectionStateResponse {
  instance?: {
    state?: string
  }
}

/**
 * Cliente HTTP da Evolution API (provider Baileys / WhatsApp Web).
 *
 * HTTP puro via `fetch`, auth por header `apikey` (sem SDK). Espelha o padrão
 * do `MercadoPagoGateway`. Instância única do número da Elopet.
 *
 * Endpoints (OpenAPI v2.3.7):
 * - POST /instance/create
 * - GET  /instance/connect/{instanceName}      → QR (pairingCode/base64/count)
 * - GET  /instance/connectionState/{instanceName}
 * - POST /message/sendText/{instanceName}
 */
export class EvolutionApiClient {
  private readonly logger = new Logger(EvolutionApiClient.name)
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = (baseUrl ?? '').trim().replace(/\/+$/, '')
    this.apiKey = (apiKey ?? '').trim()
  }

  isConfigured(): boolean {
    return this.baseUrl !== '' && this.apiKey !== ''
  }

  async createInstance(instanceName: string): Promise<void> {
    await this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      }),
    })
  }

  async connect(instanceName: string): Promise<EvolutionQrResult> {
    return this.request<EvolutionQrResult>(`/instance/connect/${instanceName}`, {
      method: 'GET',
    })
  }

  async connectionState(
    instanceName: string,
  ): Promise<EvolutionConnectionState> {
    const res = await this.request<ConnectionStateResponse>(
      `/instance/connectionState/${instanceName}`,
      { method: 'GET' },
    )
    const state = res.instance?.state
    return (state as EvolutionConnectionState) ?? 'unknown'
  }

  async sendText(
    instanceName: string,
    number: string,
    text: string,
  ): Promise<void> {
    await this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number, text }),
    })
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    this.assertConfigured()

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      this.logger.error(`Evolution ${path} erro de rede: ${String(error)}`)
      throw new EvolutionApiError(
        `Falha de rede ao chamar Evolution API: ${String(error)}`,
      )
    }

    const body = (await response.json().catch(() => ({}))) as T

    if (!response.ok) {
      this.logger.error(
        `Evolution ${path} falhou (${response.status}): ${JSON.stringify(body)}`,
      )
      throw new EvolutionApiError(`Evolution API respondeu ${response.status}`)
    }

    return body
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new EvolutionNotConfiguredError()
    }
  }
}
