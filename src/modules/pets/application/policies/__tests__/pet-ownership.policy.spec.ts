import { PetOwnership } from '../pet-ownership.policy'
import { PetOwnerMismatchError } from '../../errors'
import { Pet } from '../../../domain/entities/pet.entity'
import { PetSpecies } from '../../../domain/value-objects/pet-species.vo'

describe('PetOwnership (policy anti-IDOR)', () => {
  function makePet(ownerId: string): Pet {
    return Pet.create({
      id: 'pet-1',
      ownerId,
      name: 'Rex',
      species: PetSpecies.create('Cachorro'),
    })
  }

  it('não lança quando o ator é o dono do pet', () => {
    expect(() => PetOwnership.assertOwner(makePet('u1'), 'u1')).not.toThrow()
  })

  it('lança PetOwnerMismatchError quando o ator não é o dono', () => {
    expect(() => PetOwnership.assertOwner(makePet('u1'), 'u2')).toThrow(
      PetOwnerMismatchError,
    )
  })
})
