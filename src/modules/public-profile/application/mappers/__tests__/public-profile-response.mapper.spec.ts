import { PublicProfileResponseMapper } from '../public-profile-response.mapper'
import { PublicProfile } from '../../../domain/value-objects/public-profile.vo'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { User } from '../../../../users/domain/entities/user.entity'
import { Email } from '../../../../users/domain/value-objects/email.vo'

describe('PublicProfileResponseMapper', () => {
  function makePet() {
    return Pet.create({
      id: 'pet1',
      ownerId: 'user1',
      name: 'Thor',
      species: PetSpecies.create('Cão'),
      breed: 'Shih Tzu',
      sex: 'MALE',
      photoUrl: 'https://storage.example.com/pets/thor.jpg',
      description: 'Muito carinhoso',
      city: 'Araruama - RJ',
    })
  }

  function makeOwner() {
    return User.create({
      id: 'user1',
      name: 'João Silva',
      email: Email.create('joao@example.com'),
      passwordHash: 'hash',
      phone: '(21) 99999-9999',
    })
  }

  it('mapeia perfil ativo para snake_case', () => {
    const pet = makePet()
    pet.markLost()

    const response = PublicProfileResponseMapper.toResponse(
      PublicProfile.active(pet, makeOwner()),
      true,
    )

    expect(response).toEqual({
      status: 'ACTIVE',
      pet: {
        name: 'Thor',
        species: 'Cão',
        breed: 'Shih Tzu',
        sex: 'MALE',
        photo_url: 'https://storage.example.com/pets/thor.jpg',
        description: 'Muito carinhoso',
        city: 'Araruama - RJ',
        lost_status: true,
      },
      owner: {
        name: 'João Silva',
        phone: '(21) 99999-9999',
        email: 'joao@example.com',
      },
      message: null,
      contact_enabled: true,
    })
  })

  it('mapeia pingente não ativado (pet/owner null)', () => {
    const response = PublicProfileResponseMapper.toResponse(
      PublicProfile.unactivated('AVAILABLE'),
      false,
    )

    expect(response).toEqual({
      status: 'AVAILABLE',
      pet: null,
      owner: null,
      message: 'Este pingente ainda não foi ativado',
      contact_enabled: false,
    })
  })

  it('não expõe a flag interna kind', () => {
    const response = PublicProfileResponseMapper.toResponse(
      PublicProfile.unactivated('AVAILABLE'),
      false,
    )

    expect(response).not.toHaveProperty('kind')
  })
})
