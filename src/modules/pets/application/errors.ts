import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de pets).
 */
export class PetNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Pet não encontrado: ${id}`, 404)
  }
}

export class PetOwnerMismatchError extends DomainError {
  constructor() {
    super('Você não é o proprietário deste pet', 403)
  }
}
