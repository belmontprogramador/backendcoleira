import { DomainError } from '../../../common/errors/domain-error'

export class PlanNotFoundError extends DomainError {
  constructor() {
    super('Plano não encontrado', 404)
  }
}
