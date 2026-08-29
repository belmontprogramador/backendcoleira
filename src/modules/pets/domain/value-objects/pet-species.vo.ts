import { DomainError } from '../../../../common/errors/domain-error'

const MAX_LENGTH = 30

export class InvalidPetSpeciesError extends DomainError {
  constructor() {
    super(`Espécie deve ter entre 1 e ${MAX_LENGTH} caracteres`, 400)
  }
}

/**
 * Value object para a espécie do pet (Cão, Gato, Pássaro, ...).
 * Normaliza espaços nas bordas e impõe limite de tamanho.
 */
export class PetSpecies {
  private constructor(private readonly _value: string) {}

  static create(value: string): PetSpecies {
    const normalized = value.trim()
    if (normalized.length === 0 || normalized.length > MAX_LENGTH) {
      throw new InvalidPetSpeciesError()
    }
    return new PetSpecies(normalized)
  }

  get value(): string {
    return this._value
  }
}
