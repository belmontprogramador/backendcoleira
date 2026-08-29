import { DomainError } from '../../../../common/errors/domain-error'

/**
 * Alfabeto sem caracteres ambíguos (sem vogais I/O, sem 0 e 1).
 * doc-sistema §produto-identidade §5: não sequencial, sem revelar dados.
 */
export const PUBLIC_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const PUBLIC_ID_REGEX = /^[A-HJ-NP-Z2-9]{8}$/

export class InvalidPublicIdError extends DomainError {
  constructor() {
    super('Public ID deve ter 8 caracteres alfanuméricos (sem 0, 1, I, O)', 400)
  }
}

/**
 * Value object do Public ID — identificador lógico público do pingente.
 * 8 caracteres, sem ambiguidade, estável durante toda a vida do pingente.
 */
export class PublicId {
  private constructor(private readonly _value: string) {}

  static create(value: string): PublicId {
    const normalized = value.toUpperCase()
    if (!PUBLIC_ID_REGEX.test(normalized)) {
      throw new InvalidPublicIdError()
    }
    return new PublicId(normalized)
  }

  get value(): string {
    return this._value
  }
}
