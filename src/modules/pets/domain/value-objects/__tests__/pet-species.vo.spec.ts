import { PetSpecies, InvalidPetSpeciesError } from '../pet-species.vo'

describe('PetSpecies', () => {
  it('cria uma espécie válida', () => {
    const s = PetSpecies.create('Cão')
    expect(s.value).toBe('Cão')
  })

  it('normaliza espaços nas bordas', () => {
    const s = PetSpecies.create('  Gato  ')
    expect(s.value).toBe('Gato')
  })

  it('rejeita espécie vazia', () => {
    expect(() => PetSpecies.create('')).toThrow(InvalidPetSpeciesError)
    expect(() => PetSpecies.create('   ')).toThrow(InvalidPetSpeciesError)
  })

  it('rejeita espécie com mais de 30 caracteres', () => {
    expect(() => PetSpecies.create('a'.repeat(31))).toThrow(
      InvalidPetSpeciesError,
    )
  })
})
