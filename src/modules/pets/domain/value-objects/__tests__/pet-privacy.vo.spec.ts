import { PetPrivacy } from '../pet-privacy.vo'

describe('PetPrivacy', () => {
  it('cria com os defaults do doc-sistema', () => {
    const p = PetPrivacy.create()
    expect(p.showPhone).toBe(true)
    expect(p.showEmail).toBe(true)
    expect(p.showCity).toBe(true)
    expect(p.showMedical).toBe(false)
    expect(p.showVeterinarian).toBe(false)
    expect(p.showBehavior).toBe(false)
    expect(p.showContacts).toBe(false)
  })

  it('atualiza flags individualmente (imutável)', () => {
    const p = PetPrivacy.create()
    const updated = p.with({ showMedical: true, showBehavior: true })

    expect(updated.showMedical).toBe(true)
    expect(updated.showBehavior).toBe(true)
    // original não muda
    expect(p.showMedical).toBe(false)
    expect(p.showBehavior).toBe(false)
    // demais flags preservadas
    expect(updated.showPhone).toBe(true)
    expect(updated.showEmail).toBe(true)
    expect(updated.showCity).toBe(true)
  })

  it('reconstitui a partir de valores persistidos', () => {
    const p = PetPrivacy.reconstitute({
      showPhone: false,
      showEmail: true,
      showCity: false,
      showMedical: true,
      showVeterinarian: false,
      showBehavior: false,
      showContacts: true,
    })

    expect(p.showPhone).toBe(false)
    expect(p.showContacts).toBe(true)
  })
})
