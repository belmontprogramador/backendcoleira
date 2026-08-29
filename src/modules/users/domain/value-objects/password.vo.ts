import { DomainError } from '../../../../common/errors/domain-error'

export class WeakPasswordError extends DomainError {
  constructor() {
    super(
      'Senha deve ter no mínimo 8 caracteres, incluindo letras e números',
      400,
    )
  }
}

const MIN_LENGTH = 8
const HAS_LETTER = /[a-zA-Z]/
const HAS_NUMBER = /\d/

/**
 * Value object de senha (texto puro).
 * Valida força mínima (≥8 chars, com letra e número). O hashing é
 * responsabilidade da aplicação/infraestrutura — este VO nunca guarda o hash.
 */
export class Password {
  private constructor(private readonly raw: string) {}

  static create(value: string): Password {
    if (
      value.length < MIN_LENGTH ||
      !HAS_LETTER.test(value) ||
      !HAS_NUMBER.test(value)
    ) {
      throw new WeakPasswordError()
    }
    return new Password(value)
  }

  get value(): string {
    return this.raw
  }
}
