import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidEmailError extends DomainError {
  constructor(value: string) {
    super(`Email inválido: "${value}"`, 400)
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Value object de e-mail.
 * Garante que só existem e-mails válidos e normalizados (trim + lowercase).
 */
export class Email {
  private constructor(private readonly raw: string) {}

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase()
    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(value)
    }
    return new Email(normalized)
  }

  get value(): string {
    return this.raw
  }

  equals(other: Email): boolean {
    return this.raw === other.value
  }
}
