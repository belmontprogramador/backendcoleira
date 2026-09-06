import { DomainError } from '../../../common/errors/domain-error'

export class OrderNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Pedido não encontrado: ${id}`, 404)
  }
}

export class OrderNotPaidError extends DomainError {
  constructor(id: string) {
    super(`Pedido ${id} não está pago — só é possível despachar pedidos PAID`, 409)
  }
}

export class OrderFreightError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class ShipmentNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(`Envio não encontrado para o pedido ${orderId}`, 404)
  }
}

export class OrderStatusConflictError extends DomainError {
  constructor(from: string, to: string) {
    super(`Não é possível mudar o pedido de ${from} para ${to}`, 409)
  }
}

export class InvalidWebhookSignatureError extends DomainError {
  constructor() {
    super('Assinatura de webhook inválida', 401)
  }
}
