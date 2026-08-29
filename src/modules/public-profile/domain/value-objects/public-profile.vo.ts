import type { Pet } from '../../../pets/domain/entities/pet.entity'
import type { User } from '../../../users/domain/entities/user.entity'

export type PublicProfileKind = 'ACTIVE' | 'UNAVAILABLE'

export interface PublicPetInfo {
  name: string
  species: string
  breed: string | null
  sex: string | null
  photoUrl: string | null
  description: string | null
  city: string | null
  lostStatus: boolean
}

export interface PublicOwnerInfo {
  name: string
  phone: string | null
  email: string | null
}

export interface PublicProfileJson {
  kind: PublicProfileKind
  status: string
  pet: PublicPetInfo | null
  owner: PublicOwnerInfo | null
  message: string | null
}

/**
 * Value object do perfil público (doc-sistema §perfil-privacidade §1–§3).
 *
 * Encapsula a regra de negócio da exposição condicional: um campo só aparece
 * se a flag de privacidade correspondente estiver ativa. Nunca expõe dados
 * administrativos (senha, email administrativo, hash de ativação, tokens).
 *
 * Dois modos:
 *  - `active(pet, owner)`      → perfil do pet (privacidade aplicada).
 *  - `unactivated(status)`     → pingente sem pet ativo ("não ativado").
 */
export class PublicProfile {
  private constructor(
    private readonly _kind: PublicProfileKind,
    private readonly _status: string,
    private readonly _pet: PublicPetInfo | null,
    private readonly _owner: PublicOwnerInfo | null,
    private readonly _message: string | null,
  ) {}

  static active(pet: Pet, owner: User): PublicProfile {
    const privacy = pet.privacy
    return new PublicProfile(
      'ACTIVE',
      'ACTIVE',
      {
        name: pet.name,
        species: pet.species.value,
        breed: pet.breed,
        sex: pet.sex,
        photoUrl: pet.photoUrl,
        description: pet.description,
        city: privacy.showCity ? pet.city : null,
        lostStatus: pet.lostStatus,
      },
      {
        name: owner.name,
        phone: privacy.showPhone ? owner.phone : null,
        email: privacy.showEmail ? owner.email.value : null,
      },
      null,
    )
  }

  static unactivated(status: string): PublicProfile {
    return new PublicProfile(
      'UNAVAILABLE',
      status,
      null,
      null,
      'Este pingente ainda não foi ativado',
    )
  }

  /** Serializa para cache (JSON puro, sem referências a entidades). */
  toJSON(): PublicProfileJson {
    return {
      kind: this._kind,
      status: this._status,
      pet: this._pet,
      owner: this._owner,
      message: this._message,
    }
  }

  /** Reconstrói a partir do JSON do cache. */
  static fromJSON(json: PublicProfileJson): PublicProfile {
    return new PublicProfile(
      json.kind,
      json.status,
      json.pet,
      json.owner,
      json.message,
    )
  }

  get kind(): PublicProfileKind {
    return this._kind
  }

  get isActive(): boolean {
    return this._kind === 'ACTIVE'
  }

  get status(): string {
    return this._status
  }

  get pet(): PublicPetInfo | null {
    return this._pet
  }

  get owner(): PublicOwnerInfo | null {
    return this._owner
  }

  get message(): string | null {
    return this._message
  }
}
