import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidPetContactError extends DomainError {
  constructor() {
    super('Nome do contato não pode ser vazio', 400)
  }
}

export interface CreatePetContactProps {
  id: string
  petId: string
  name: string
  phone?: string | null
  email?: string | null
  relationship?: string | null
  isPrimary?: boolean
}

export interface ReconstructPetContactProps {
  id: string
  petId: string
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UpdatePetContactData {
  name?: string
  phone?: string | null
  email?: string | null
  relationship?: string | null
  isPrimary?: boolean
}

/**
 * Entidade `PetContact` — contato de emergência do pet (feature Premium
 * `MULTIPLE_CONTACTS`). Invariante: `name` nunca vazio (após trim).
 */
export class PetContact {
  private constructor(
    private readonly _id: string,
    private readonly _petId: string,
    private _name: string,
    private _phone: string | null,
    private _email: string | null,
    private _relationship: string | null,
    private _isPrimary: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreatePetContactProps): PetContact {
    const name = props.name.trim()
    if (name.length === 0) {
      throw new InvalidPetContactError()
    }
    return new PetContact(
      props.id,
      props.petId,
      name,
      props.phone ?? null,
      props.email ?? null,
      props.relationship ?? null,
      props.isPrimary ?? false,
      new Date(),
      new Date(),
    )
  }

  static reconstitute(props: ReconstructPetContactProps): PetContact {
    return new PetContact(
      props.id,
      props.petId,
      props.name,
      props.phone,
      props.email,
      props.relationship,
      props.isPrimary,
      props.createdAt,
      props.updatedAt,
    )
  }

  /**
   * Atualiza apenas os campos informados (`undefined` preserva; `null` limpa).
   * `name` é validado (trim não vazio).
   */
  update(data: UpdatePetContactData): void {
    if (data.name !== undefined) {
      const name = data.name.trim()
      if (name.length === 0) {
        throw new InvalidPetContactError()
      }
      this._name = name
    }
    if (data.phone !== undefined) this._phone = data.phone
    if (data.email !== undefined) this._email = data.email
    if (data.relationship !== undefined) this._relationship = data.relationship
    if (data.isPrimary !== undefined) this._isPrimary = data.isPrimary
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get petId(): string {
    return this._petId
  }
  get name(): string {
    return this._name
  }
  get phone(): string | null {
    return this._phone
  }
  get email(): string | null {
    return this._email
  }
  get relationship(): string | null {
    return this._relationship
  }
  get isPrimary(): boolean {
    return this._isPrimary
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
