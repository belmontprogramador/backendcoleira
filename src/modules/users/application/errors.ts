import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de usuários).
 */
export class UserNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Usuário não encontrado: ${id}`, 404)
  }
}

export class EmailAlreadyInUseError extends DomainError {
  constructor(email: string) {
    super(`Email já cadastrado: ${email}`, 409)
  }
}

export class IncorrectPasswordError extends DomainError {
  constructor() {
    super('Senha atual incorreta', 401)
  }
}

export class RoleNotFoundError extends DomainError {
  constructor(role: string) {
    super(`Role não encontrada: ${role}`, 404)
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super('Token inválido ou expirado', 401)
  }
}

export class HierarchyViolationError extends DomainError {
  constructor() {
    super('Sem permissão hierárquica para gerenciar este usuário', 403)
  }
}

export class EmailDeliveryError extends DomainError {
  constructor(
    message = 'Falha ao enviar e-mail. A operação não foi concluída.',
  ) {
    super(message, 502)
  }
}
