import { DomainError } from '../../../common/errors/domain-error'

export class AffiliateNotFoundError extends DomainError {
  constructor() {
    super('Afiliado não encontrado', 404)
  }
}

export class AffiliateCodeAlreadyInUseError extends DomainError {
  constructor() {
    super('Código de afiliado já está em uso', 409)
  }
}

export class AffiliateEmailAlreadyInUseError extends DomainError {
  constructor() {
    super('Email já está em uso por outro afiliado', 409)
  }
}

export class WithdrawalNotFoundError extends DomainError {
  constructor() {
    super('Saque não encontrado', 404)
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super('Saldo insuficiente para o saque', 400)
  }
}

export class WithdrawalBelowMinimumError extends DomainError {
  constructor() {
    super('Valor do saque abaixo do mínimo do afiliado', 400)
  }
}

export class NoAffiliateProfileError extends DomainError {
  constructor() {
    super('Usuário não possui perfil de afiliado ativo', 403)
  }
}
