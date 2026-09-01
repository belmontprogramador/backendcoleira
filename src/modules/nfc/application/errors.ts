import { DomainError } from '../../../common/errors/domain-error'

/**
 * Erros da camada de aplicação (casos de uso de NFC/produção).
 */
export class BatchNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Lote não encontrado: ${id}`, 404)
  }
}

export class TagNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Tag não encontrada: ${id}`, 404)
  }
}

export class BatchEmptyError extends DomainError {
  constructor(id: string) {
    super(`Lote sem tags geradas: ${id}`, 400)
  }
}

export class DuplicateUidError extends DomainError {
  constructor(uid: string) {
    super(`UID já associado a outra tag: ${uid}`, 409)
  }
}

export class DuplicateBatchNameError extends DomainError {
  constructor(name: string) {
    super(`Já existe um lote com o nome: ${name}`, 409)
  }
}

export class WriteNfcFailedError extends DomainError {
  constructor(publicId: string, attempts: number) {
    super(`Falha na gravação NFC após ${attempts} tentativas: ${publicId}`, 400)
  }
}
