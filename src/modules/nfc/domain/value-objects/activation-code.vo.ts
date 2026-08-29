import { DomainError } from '../../../../common/errors/domain-error'

export const ACTIVATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const ACTIVATION_CODE_REGEX = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

export class InvalidActivationCodeError extends DomainError {
  constructor() {
    super(
      'Código de ativação deve ter o formato XXXX-XXXX (sem 0, 1, I, O)',
      400,
    )
  }
}

/**
 * Value object do código de ativação — segredo single-use (doc-sistema §4).
 * Representa o código em TEXTO PURO (para exibição única na etiqueta).
 * O armazenamento em banco é SEMPRE o hash (nunca este valor).
 */
export class ActivationCode {
  private constructor(private readonly _value: string) {}

  static create(value: string): ActivationCode {
    const normalized = value.toUpperCase()
    if (!ACTIVATION_CODE_REGEX.test(normalized)) {
      throw new InvalidActivationCodeError()
    }
    return new ActivationCode(normalized)
  }

  get value(): string {
    return this._value
  }
}
