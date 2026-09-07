import { Logger } from '@nestjs/common'

/**
 * Scopes (permissões) solicitados na autorização OAuth — espaço-separados.
 * São as permissões mínimas para o pipeline completo de frete/despacho usado
 * pelo Elopet (cotação, rastreio, carrinho, checkout, geração e impressão).
 * Sem o `scope`, o token nasce sem permissão e a API responde 403.
 */
const ME_SHIPPING_SCOPES = [
  'shipping-calculate',
  'shipping-tracking',
  'cart-write',
  'shipping-checkout',
  'shipping-generate',
  'shipping-print',
].join(' ')

export class MelhorEnvioApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'MelhorEnvioApiError'
    this.status = status
  }
}

/** A Melhor Envio não está configurada (base URL / credenciais OAuth ausentes). */
export class MelhorEnvioNotConfiguredError extends MelhorEnvioApiError {
  constructor() {
    super(
      'Melhor Envio não configurada (MELHOR_ENVIO_BASE_URL / CLIENT_ID / CLIENT_SECRET ausentes)',
    )
    this.name = 'MelhorEnvioNotConfiguredError'
  }
}

export interface MelhorEnvioClientConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  userAgent: string
}

/** Resposta bruta de `POST /oauth/token` (snake_case, formato ME). */
export interface OAuthTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/** Payload de `POST /api/v2/me/shipment/calculate` (raw, formato ME). */
export interface CalculateQuotationInput {
  from: { postal_code: string }
  to: { postal_code: string }
  products?: Array<{
    id: string
    width: number
    height: number
    length: number
    weight: number
    insurance_value: number
    quantity: number
  }>
  volumes?: Array<{
    width: number
    height: number
    length: number
    weight: number
    insurance: number
    quantity?: number
  }>
  options?: { receipt?: boolean; own_hand?: boolean }
  services?: string
}

/**
 * Oferta de frete retornada por `calculate` (raw, formato ME).
 * Campos anuláveis: quando a transportadora não consegue cotar (dimensões/peso
 * fora do padrão), a ME devolve `price: null` (e `error`), não "0".
 */
export interface Quotation {
  id: number
  name: string
  price: string | null
  custom_price: string | null
  discount: string | null
  currency: string | null
  delivery_time: number | null
  custom_delivery_time: number | null
  company: { id: number; name: string; picture: string }
  error?: string | null
}

/** Item de rastreio retornado por `POST /api/v2/me/shipment/tracking`. */
export interface TrackingInfo {
  id: string
  protocol: string
  status: string
  tracking: string | null
  melhorenvio_tracking: string | null
  created_at: string
  paid_at: string | null
  generated_at: string | null
  posted_at: string | null
  delivered_at: string | null
  canceled_at: string | null
  expired_at: string | null
}

/** Endereço do remetente/destinatário no carrinho (raw, formato ME). */
export interface CartAddress {
  name: string
  phone: string
  email: string
  document?: string
  postal_code: string
  address: string
  city: string
  state_abbr: string
}

/** Payload de `POST /api/v2/me/cart` (raw, formato ME). */
export interface CartInput {
  service: number
  from: CartAddress
  to: CartAddress
  products?: Array<{
    id: string
    width: number
    height: number
    length: number
    weight: number
    insurance_value: number
    quantity: number
  }>
  volumes?: Array<{
    width: number
    height: number
    length: number
    weight: number
    insurance: number
    quantity?: number
  }>
  options?: { receipt?: boolean; own_hand?: boolean; non_commercial?: boolean }
}

/** Resposta de `POST /api/v2/me/cart` — a etiqueta criada no carrinho. */
export interface CartResponse {
  id: string
  protocol: string
}

/** Resposta de `POST /api/v2/me/shipment/checkout`. */
export interface CheckoutResponse {
  purchase: { id: string; protocol: string; total: number; status: string }
  orders: Array<{ id: string; protocol: string; status: string }>
}

/** Resposta de `POST /api/v2/me/shipment/generate`. */
export interface GenerateResponse {
  [orderId: string]: { status: boolean; message: string }
}

/** Resposta de `POST /api/v2/me/shipment/print`. */
export interface PrintResponse {
  url: string
}

/**
 * Cliente HTTP da Melhor Envio API (logística).
 *
 * HTTP puro via `fetch`, OAuth 2.0 (Authorization Code) + endpoints de frete.
 * Headers obrigatórios em toda request: `Accept`, `Content-Type` e `User-Agent`
 * (a API rejeita sem `User-Agent`). Este cliente NÃO gerencia token — recebe o
 * `access_token` por parâmetro; o refresh-on-401 fica no `MelhorEnvioGateway`
 * (V.6), que usa o `ShippingTokenStorePort` para persistir os tokens.
 *
 * Endpoints:
 * - POST /oauth/token                       (authorization_code | refresh_token)
 * - POST /api/v2/me/shipment/calculate      (cotação de frete)
 * - POST /api/v2/me/shipment/tracking       (rastreio)
 */
export class MelhorEnvioClient {
  private readonly logger = new Logger(MelhorEnvioClient.name)
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly userAgent: string

  constructor(config: MelhorEnvioClientConfig) {
    this.baseUrl = (config.baseUrl ?? '').trim().replace(/\/+$/, '')
    this.clientId = (config.clientId ?? '').trim()
    this.clientSecret = (config.clientSecret ?? '').trim()
    this.redirectUri = (config.redirectUri ?? '').trim()
    this.userAgent = (config.userAgent ?? '').trim()
  }

  isConfigured(): boolean {
    return (
      this.baseUrl !== '' &&
      this.clientId !== '' &&
      this.clientSecret !== ''
    )
  }

  /**
   * Monta a URL de autorização OAuth (`GET {base}/oauth/authorize`).
   * Retorna `null` quando a app não está configurada.
   */
  buildAuthorizeUrl(state?: string): string | null {
    if (!this.isConfigured()) {
      return null
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: ME_SHIPPING_SCOPES,
    })
    if (state) {
      params.set('state', state)
    }
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`
  }

  /** Troca o `code` do callback OAuth por access/refresh tokens. */
  async exchangeAuthorizationCode(code: string): Promise<OAuthTokenResponse> {
    return this.requestForm<OAuthTokenResponse>('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    })
  }

  /**
   * Renova o token (obrigatório — access expira em 30 dias, refresh em 45).
   * A doc da ME indica apenas `grant_type` + `refresh_token` no refresh.
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<OAuthTokenResponse> {
    return this.requestForm<OAuthTokenResponse>('/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  }

  /** Cotação de frete (produtos/volumes + CEP origem/destino). */
  async calculateShipping(
    input: CalculateQuotationInput,
    accessToken: string,
  ): Promise<Quotation[]> {
    return this.requestJson<Quotation[]>(
      '/api/v2/me/shipment/calculate',
      input,
      accessToken,
    )
  }

  /** Rastreio de etiquetas por `id`/`protocol`. */
  async trackOrders(
    orders: string[],
    accessToken: string,
  ): Promise<Record<string, TrackingInfo>> {
    return this.requestJson<Record<string, TrackingInfo>>(
      '/api/v2/me/shipment/tracking',
      { orders },
      accessToken,
    )
  }

  /** Insere a etiqueta no carrinho (passo 1 do pipeline de despacho). */
  async addToCart(
    input: CartInput,
    accessToken: string,
  ): Promise<CartResponse> {
    return this.requestJson<CartResponse>('/api/v2/me/cart', input, accessToken)
  }

  /** Paga a etiqueta com o saldo da carteira (passo 2). */
  async checkout(
    orderIds: string[],
    accessToken: string,
  ): Promise<CheckoutResponse> {
    return this.requestJson<CheckoutResponse>(
      '/api/v2/me/shipment/checkout',
      { orders: orderIds },
      accessToken,
    )
  }

  /** Gera a etiqueta e comunica a transportadora (passo 3). */
  async generateLabels(
    orderIds: string[],
    accessToken: string,
  ): Promise<GenerateResponse> {
    return this.requestJson<GenerateResponse>(
      '/api/v2/me/shipment/generate',
      { orders: orderIds },
      accessToken,
    )
  }

  /** Retorna a URL de impressão da etiqueta (passo 4). */
  async printLabels(
    mode: 'private' | 'public',
    orderIds: string[],
    accessToken: string,
  ): Promise<PrintResponse> {
    return this.requestJson<PrintResponse>(
      '/api/v2/me/shipment/print',
      { mode, orders: orderIds },
      accessToken,
    )
  }

  private async requestJson<T>(
    path: string,
    body: unknown,
    accessToken: string,
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify(body),
    })
  }

  private async requestForm<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams(params).toString(),
    })
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
      Authorization: `Bearer ${accessToken}`,
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    this.assertConfigured()

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, init)
    } catch (error) {
      this.logger.error(`Melhor Envio ${path} erro de rede: ${String(error)}`)
      throw new MelhorEnvioApiError(
        `Falha de rede ao chamar Melhor Envio: ${String(error)}`,
      )
    }

    const body = (await response.json().catch(() => ({}))) as T

    if (!response.ok) {
      this.logger.error(
        `Melhor Envio ${path} falhou (${response.status}): ${JSON.stringify(body)}`,
      )
      throw new MelhorEnvioApiError(
        `Melhor Envio respondeu ${response.status}`,
        response.status,
      )
    }

    return body
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new MelhorEnvioNotConfiguredError()
    }
  }
}
