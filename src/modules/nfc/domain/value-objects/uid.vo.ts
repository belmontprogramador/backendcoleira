import { DomainError } from '../../../../common/errors/domain-error'

const UID_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

export class InvalidUidError extends DomainError {
  constructor() {
    super('UID físico deve ter o formato XX:XX:XX:XX:XX:XX (hexadecimal)', 400)
  }
}

/**
 * Value object do UID — identificação física do chip NFC.
 * Lido do hardware (leitor USB), não gerado pelo sistema.
 */
export class Uid {
  private constructor(private readonly _value: string) {}

  static create(value: string): Uid {
    const normalized = value.toUpperCase()
    if (!UID_REGEX.test(normalized)) {
      throw new InvalidUidError()
    }
    return new Uid(normalized)
  }

  get value(): string {
    return this._value
  }
}
