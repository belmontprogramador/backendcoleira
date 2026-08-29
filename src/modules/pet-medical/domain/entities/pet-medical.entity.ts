export interface CreatePetMedicalProps {
  petId: string
  allergies?: string | null
  medications?: string | null
  specialCare?: string | null
  medicalConditions?: string | null
  veterinarianName?: string | null
  veterinarianPhone?: string | null
}

export interface ReconstructPetMedicalProps {
  petId: string
  allergies: string | null
  medications: string | null
  specialCare: string | null
  medicalConditions: string | null
  veterinarianName: string | null
  veterinarianPhone: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UpdatePetMedicalData {
  allergies?: string | null
  medications?: string | null
  specialCare?: string | null
  medicalConditions?: string | null
  veterinarianName?: string | null
  veterinarianPhone?: string | null
}

/**
 * Entidade `PetMedical` — dados médicos do pet (feature Premium `PET_MEDICAL`).
 * 1:1 com `Pet` (pet_id é a PK). Sem invariantes rígidas: todos os campos são
 * opcionais e podem ser limpos via `null`.
 */
export class PetMedical {
  private constructor(
    private readonly _petId: string,
    private _allergies: string | null,
    private _medications: string | null,
    private _specialCare: string | null,
    private _medicalConditions: string | null,
    private _veterinarianName: string | null,
    private _veterinarianPhone: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreatePetMedicalProps): PetMedical {
    return new PetMedical(
      props.petId,
      props.allergies ?? null,
      props.medications ?? null,
      props.specialCare ?? null,
      props.medicalConditions ?? null,
      props.veterinarianName ?? null,
      props.veterinarianPhone ?? null,
      new Date(),
      new Date(),
    )
  }

  static reconstitute(props: ReconstructPetMedicalProps): PetMedical {
    return new PetMedical(
      props.petId,
      props.allergies,
      props.medications,
      props.specialCare,
      props.medicalConditions,
      props.veterinarianName,
      props.veterinarianPhone,
      props.createdAt,
      props.updatedAt,
    )
  }

  /**
   * Atualiza apenas os campos informados (`undefined` preserva; `null` limpa).
   */
  update(data: UpdatePetMedicalData): void {
    if (data.allergies !== undefined) this._allergies = data.allergies
    if (data.medications !== undefined) this._medications = data.medications
    if (data.specialCare !== undefined) this._specialCare = data.specialCare
    if (data.medicalConditions !== undefined) {
      this._medicalConditions = data.medicalConditions
    }
    if (data.veterinarianName !== undefined) {
      this._veterinarianName = data.veterinarianName
    }
    if (data.veterinarianPhone !== undefined) {
      this._veterinarianPhone = data.veterinarianPhone
    }
    this._updatedAt = new Date()
  }

  get petId(): string {
    return this._petId
  }
  get allergies(): string | null {
    return this._allergies
  }
  get medications(): string | null {
    return this._medications
  }
  get specialCare(): string | null {
    return this._specialCare
  }
  get medicalConditions(): string | null {
    return this._medicalConditions
  }
  get veterinarianName(): string | null {
    return this._veterinarianName
  }
  get veterinarianPhone(): string | null {
    return this._veterinarianPhone
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
