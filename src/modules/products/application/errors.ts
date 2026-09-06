import { DomainError } from '../../../common/errors/domain-error'

export class ProductNotFoundError extends DomainError {
  constructor() {
    super('Produto não encontrado', 404)
  }
}
