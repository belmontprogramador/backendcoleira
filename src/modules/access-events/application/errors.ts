import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação do módulo de eventos de acesso.
 */
export class AccessEventNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Acesso não encontrado: ${id}`, 404)
  }
}

/**
 * O `access_id` reportado não pertence ao pingente informado, ou o evento é
 * antigo demais para receber localização (anti-abuso). → 403.
 */
export class AccessEventLocationInvalidError extends DomainError {
  constructor(id: string) {
    super(`Localização inválida para este acesso: ${id}`, 403)
  }
}
