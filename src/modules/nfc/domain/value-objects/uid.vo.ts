import { DomainError } from '../../../../common/errors/domain-error'

/**
 * UID físico de chips NFC — 6 ou 7 bytes (NTAG213/215/216 usam 7 bytes).
 * Aceita tanto o formato com separador (`XX:XX:...`) quanto o hex cru do Web
 * NFC (`serialNumber`, sem separador) — normalizando para `XX:XX:...`.
 */
export class InvalidUidError extends DomainError {
  constructor() {
    super(
      'UID físico deve ter 6 ou 7 bytes (hexadecimal, com ou sem separador)',
      400,
    )
  }
}

/**
 * Value object do UID — identificação física do chip NFC.
 * Lido do hardware (leitor USB ou Web NFC), nunca gerado pelo sistema.
 */
export class Uid {
  private constructor(private readonly _value: string) {}

  static create(value: string): Uid {
    const raw = value.toUpperCase().replace(/[\s:-]/g, '')
    if (!/^[0-9A-F]{12}$/.test(raw) && !/^[0-9A-F]{14}$/.test(raw)) {
      throw new InvalidUidError()
    }
    const formatted = (raw.match(/.{1,2}/g) ?? []).join(':')
    return new Uid(formatted)
  }

  get value(): string {
    return this._value
  }
}
