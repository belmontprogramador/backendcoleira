import { DomainError } from './domain-error'

/**
 * Erro de comunicação com o gateway de pagamento (Mercado Pago).
 * Transversal: usado pelo gateway (infra) e propagado aos use cases de
 * checkout/confirmação. HTTP 502 (bad gateway).
 */
export class PaymentGatewayError extends DomainError {
  constructor(
    message = 'Falha na comunicação com o gateway de pagamento. Tente novamente.',
  ) {
    super(message, 502)
  }
}
