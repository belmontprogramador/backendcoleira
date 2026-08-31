import { DomainError } from '../../../common/errors/domain-error'

export class FreePlanCheckoutError extends DomainError {
  constructor() {
    super('Plano gratuito não requer checkout', 400)
  }
}

export class InvalidWebhookSignatureError extends DomainError {
  constructor() {
    super('Assinatura do webhook inválida', 401)
  }
}

export class InvalidWebhookPayloadError extends DomainError {
  constructor() {
    super('Payload do webhook inválido', 400)
  }
}

export class SubscriptionNotFoundError extends DomainError {
  constructor() {
    super('Assinatura não encontrada', 404)
  }
}

export class ActiveSubscriptionExistsError extends DomainError {
  constructor() {
    super('Você já possui uma assinatura ativa.', 409)
  }
}

export class PaymentGatewayError extends DomainError {
  constructor(
    message = 'Falha na comunicação com o gateway de pagamento. Tente novamente.',
  ) {
    super(message, 502)
  }
}
