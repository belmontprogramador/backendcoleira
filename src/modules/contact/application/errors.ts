import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de contato).
 */
export class TagNotActivatedError extends DomainError {
  constructor() {
    super('Este pingente ainda não está ativado a um pet', 400)
  }
}

export class ContactMessageNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Mensagem de contato não encontrada: ${id}`, 404)
  }
}
