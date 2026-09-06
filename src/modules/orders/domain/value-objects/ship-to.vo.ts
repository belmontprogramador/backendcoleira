import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidShipToError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface ShipToProps {
  postalCode: string
  street: string
  number: string
  city: string
  state: string
  name: string
  phone: string
}

/**
 * Value object imutável — endereço de entrega do pedido (snapshot no checkout).
 * Invariantes: CEP 8 dígitos, UF 2 letras, campos obrigatórios não vazios.
 * `create` normaliza CEP (remove máscara) e UF (uppercase).
 */
export class ShipTo {
  private constructor(
    private readonly _postalCode: string,
    private readonly _street: string,
    private readonly _number: string,
    private readonly _city: string,
    private readonly _state: string,
    private readonly _name: string,
    private readonly _phone: string,
  ) {}

  static create(props: ShipToProps): ShipTo {
    const postalCode = props.postalCode.trim().replace(/\D/g, '')
    const state = props.state.trim().toUpperCase()
    const street = props.street.trim()
    const number = props.number.trim()
    const city = props.city.trim()
    const name = props.name.trim()
    const phone = props.phone.trim()

    if (!/^\d{8}$/.test(postalCode)) {
      throw new InvalidShipToError('CEP deve ter 8 dígitos')
    }
    if (state.length !== 2) {
      throw new InvalidShipToError('UF deve ter 2 letras')
    }
    if (!street || !number || !city || !name || !phone) {
      throw new InvalidShipToError('Endereço de entrega incompleto')
    }

    return new ShipTo(postalCode, street, number, city, state, name, phone)
  }

  get postalCode(): string {
    return this._postalCode
  }
  get street(): string {
    return this._street
  }
  get number(): string {
    return this._number
  }
  get city(): string {
    return this._city
  }
  get state(): string {
    return this._state
  }
  get name(): string {
    return this._name
  }
  get phone(): string {
    return this._phone
  }

  equals(other: ShipTo): boolean {
    return (
      this._postalCode === other._postalCode &&
      this._street === other._street &&
      this._number === other._number &&
      this._city === other._city &&
      this._state === other._state &&
      this._name === other._name &&
      this._phone === other._phone
    )
  }
}
