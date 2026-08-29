import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de contatos do pet).
 */
export class PetContactNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Contato do pet não encontrado: ${id}`, 404)
  }
}
