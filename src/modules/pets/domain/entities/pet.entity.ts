import { PetSpecies } from '../value-objects/pet-species.vo'
import { PetPrivacy } from '../value-objects/pet-privacy.vo'
import type { PetSex } from '../value-objects/pet-sex.vo'
import { DomainError } from '../../../../common/errors/domain-error'

export class PetAlreadyDeletedError extends DomainError {
  constructor(id: string) {
    super(`Pet ${id} já foi desativado`, 400)
  }
}

export interface CreatePetProps {
  id: string
  ownerId: string
  name: string
  species: PetSpecies
  breed?: string | null
  sex?: PetSex | null
  birthDate?: Date | null
  photoUrl?: string | null
  description?: string | null
  city?: string | null
}

export interface UpdatePetProfileProps {
  name?: string
  breed?: string | null
  sex?: PetSex | null
  birthDate?: Date | null
  description?: string | null
  city?: string | null
}

export interface ReconstructPetProps {
  id: string
  ownerId: string
  name: string
  species: PetSpecies
  breed: string | null
  sex: PetSex | null
  birthDate: Date | null
  photoUrl: string | null
  description: string | null
  city: string | null
  lostStatus: boolean
  privacy: PetPrivacy
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * Agregado Pet.
 * Encapsula o ciclo de vida: criação, atualização de perfil, modo perdido,
 * privacidade e soft delete.
 */
export class Pet {
  private constructor(
    private readonly _id: string,
    private readonly _ownerId: string,
    private _name: string,
    private readonly _species: PetSpecies,
    private _breed: string | null,
    private _sex: PetSex | null,
    private _birthDate: Date | null,
    private _photoUrl: string | null,
    private _description: string | null,
    private _city: string | null,
    private _lostStatus: boolean,
    private _privacy: PetPrivacy,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(props: CreatePetProps): Pet {
    const now = new Date()
    return new Pet(
      props.id,
      props.ownerId,
      props.name,
      props.species,
      props.breed ?? null,
      props.sex ?? null,
      props.birthDate ?? null,
      props.photoUrl ?? null,
      props.description ?? null,
      props.city ?? null,
      false,
      PetPrivacy.create(),
      now,
      now,
      null,
    )
  }

  static reconstitute(props: ReconstructPetProps): Pet {
    return new Pet(
      props.id,
      props.ownerId,
      props.name,
      props.species,
      props.breed,
      props.sex,
      props.birthDate,
      props.photoUrl,
      props.description,
      props.city,
      props.lostStatus,
      props.privacy,
      props.createdAt,
      props.updatedAt,
      props.deletedAt,
    )
  }

  markLost(): void {
    this.assertNotDeleted()
    this._lostStatus = true
    this.touch()
  }

  markFound(): void {
    this.assertNotDeleted()
    this._lostStatus = false
    this.touch()
  }

  updateProfile(props: UpdatePetProfileProps): void {
    this.assertNotDeleted()
    if (props.name !== undefined) {
      this._name = props.name
    }
    if (props.breed !== undefined) {
      this._breed = props.breed
    }
    if (props.sex !== undefined) {
      this._sex = props.sex
    }
    if (props.birthDate !== undefined) {
      this._birthDate = props.birthDate
    }
    if (props.description !== undefined) {
      this._description = props.description
    }
    if (props.city !== undefined) {
      this._city = props.city
    }
    this.touch()
  }

  updatePrivacy(
    changes: Partial<{
      showPhone: boolean
      showEmail: boolean
      showCity: boolean
      showMedical: boolean
      showVeterinarian: boolean
      showBehavior: boolean
      showContacts: boolean
    }>,
  ): void {
    this.assertNotDeleted()
    this._privacy = this._privacy.with(changes)
    this.touch()
  }

  setPhotoUrl(url: string): void {
    this.assertNotDeleted()
    this._photoUrl = url
    this.touch()
  }

  removePhoto(): void {
    this.assertNotDeleted()
    this._photoUrl = null
    this.touch()
  }

  deactivate(): void {
    this.assertNotDeleted()
    this._deletedAt = new Date()
    this.touch()
  }

  private assertNotDeleted(): void {
    if (this._deletedAt !== null) {
      throw new PetAlreadyDeletedError(this._id)
    }
  }

  private touch(): void {
    this._updatedAt = new Date()
  }

  // ── getters ────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id
  }
  get ownerId(): string {
    return this._ownerId
  }
  get name(): string {
    return this._name
  }
  get species(): PetSpecies {
    return this._species
  }
  get breed(): string | null {
    return this._breed
  }
  get sex(): PetSex | null {
    return this._sex
  }
  get birthDate(): Date | null {
    return this._birthDate
  }
  get photoUrl(): string | null {
    return this._photoUrl
  }
  get description(): string | null {
    return this._description
  }
  get city(): string | null {
    return this._city
  }
  get lostStatus(): boolean {
    return this._lostStatus
  }
  get privacy(): PetPrivacy {
    return this._privacy
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
  get deletedAt(): Date | null {
    return this._deletedAt
  }
}
