export interface PetPrivacyProps {
  showPhone: boolean
  showEmail: boolean
  showCity: boolean
  showMedical: boolean
  showVeterinarian: boolean
  showBehavior: boolean
  showContacts: boolean
}

/**
 * Value object das configurações de privacidade de um pet (doc-sistema §4).
 * Imutável: `with(...)` retorna uma nova instância com as flags alteradas.
 *
 * Defaults (doc-sistema): telefone e cidade públicos; o resto privado.
 */
export class PetPrivacy {
  private constructor(private readonly props: PetPrivacyProps) {}

  static create(): PetPrivacy {
    return new PetPrivacy({
      showPhone: true,
      showEmail: false,
      showCity: true,
      showMedical: false,
      showVeterinarian: false,
      showBehavior: false,
      showContacts: false,
    })
  }

  static reconstitute(props: PetPrivacyProps): PetPrivacy {
    return new PetPrivacy({ ...props })
  }

  with(changes: Partial<PetPrivacyProps>): PetPrivacy {
    return new PetPrivacy({ ...this.props, ...changes })
  }

  get showPhone(): boolean {
    return this.props.showPhone
  }
  get showEmail(): boolean {
    return this.props.showEmail
  }
  get showCity(): boolean {
    return this.props.showCity
  }
  get showMedical(): boolean {
    return this.props.showMedical
  }
  get showVeterinarian(): boolean {
    return this.props.showVeterinarian
  }
  get showBehavior(): boolean {
    return this.props.showBehavior
  }
  get showContacts(): boolean {
    return this.props.showContacts
  }
}
