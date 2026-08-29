import { DomainError } from '../../common/errors/domain-error'

/**
 * Erros da camada de aplicação do módulo de autenticação.
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Credenciais inválidas', 401)
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('Refresh token inválido', 401)
  }
}
