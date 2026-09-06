import { DomainError } from './domain-error'

/**
 * Erro de comunicação com o gateway de frete (Melhor Envio).
 * Transversal: usado pelo gateway (infra) e propagado aos use cases de
 * cotação/despacho. HTTP 502 (bad gateway).
 */
export class ShippingGatewayError extends DomainError {
  constructor(
    message = 'Falha na comunicação com o gateway de frete. Tente novamente.',
  ) {
    super(message, 502)
  }
}
