import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de ownership/ativação).
 *
 * ⚠️ REUSO (não duplicar): erros que já existem nos módulos donos são
 * re-exportados aqui para manter uma única fonte de verdade — classes
 * duplicadas com o mesmo `name` quebrariam `instanceof` e confundiriam o
 * rastreamento de origem.
 */
export { TagNotFoundError } from '../../nfc/application/errors'
export {
  PetNotFoundError,
  PetOwnerMismatchError,
} from '../../pets/application/errors'
export { UserNotFoundError } from '../../users/application/errors'
export {
  TagAlreadyActivatedError,
  TagNotActiveError,
} from '../../nfc/domain/entities/nfc-tag.entity'

/** Código de ativação não corresponde ao hash armazenado. */
export class ActivationCodeMismatchError extends DomainError {
  constructor() {
    super('Código de ativação inválido', 400)
  }
}

export class TagNotOwnedError extends DomainError {
  constructor() {
    super('Você não é o proprietário deste pingente', 403)
  }
}

export class PetAlreadyAssociatedError extends DomainError {
  constructor() {
    super('Este pet já está associado a outro pingente', 400)
  }
}

export class TagAlreadyAssociatedError extends DomainError {
  constructor() {
    super('Este pingente já está associado a um pet', 400)
  }
}

export class NoPetAssociatedError extends DomainError {
  constructor() {
    super('Nenhum pet associado a este pingente', 400)
  }
}

export class TransferToSelfError extends DomainError {
  constructor() {
    super('Não é possível transferir para si mesmo', 400)
  }
}

export class TransferTokenInvalidError extends DomainError {
  constructor() {
    super('Token de transferência inválido ou expirado', 400)
  }
}

export class TransferUserMismatchError extends DomainError {
  constructor() {
    super('Este token de transferência pertence a outro destinatário', 403)
  }
}
