import { PublicProfileResponseMapper } from '../public-profile-response.mapper'
import { PublicProfile } from '../../../domain/value-objects/public-profile.vo'
import type { PublicProfileResult } from '../../use-cases/get-public-profile.use-case'
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

  function makeResult(
    overrides: Partial<PublicProfileResult> = {},
  ): PublicProfileResult {
    return {
      profile: PublicProfile.unactivated('AVAILABLE'),
      contactEnabled: false,
      medical: null,
      contacts: [],
      locationApprox: null,
      ...overrides,
    }
  }

  it('mapeia perfil ativo para snake_case', () => {
    const pet = makePet()
    pet.markLost()

    const response = PublicProfileResponseMapper.toResponse(
      makeResult({
        profile: PublicProfile.active(pet, makeOwner()),
        contactEnabled: true,
      }),
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
      medical: null,
      contacts: [],
      location_approx: null,
    })
  })

  it('mapeia dados médicos e contatos (premium) para snake_case', () => {
    const response = PublicProfileResponseMapper.toResponse(
      makeResult({
        medical: {
          allergies: 'Dipirona',
          medications: 'Vermífugo',
          specialCare: 'Não dar chocolate',
          medicalConditions: 'Nenhuma',
          veterinarianName: 'Dra. Ana',
          veterinarianPhone: '(21) 98888-7777',
        },
        contacts: [
          {
            name: 'Maria (mãe)',
            phone: '(21) 97777-6666',
            email: 'maria@example.com',
            relationship: 'Família',
          },
        ],
      }),
    )

    expect(response.medical).toEqual({
      allergies: 'Dipirona',
      medications: 'Vermífugo',
      special_care: 'Não dar chocolate',
      medical_conditions: 'Nenhuma',
      veterinarian_name: 'Dra. Ana',
      veterinarian_phone: '(21) 98888-7777',
    })
    expect(response.contacts).toEqual([
      {
        name: 'Maria (mãe)',
        phone: '(21) 97777-6666',
        email: 'maria@example.com',
        relationship: 'Família',
      },
    ])
  })

  it('mapeia pingente não ativado (pet/owner null)', () => {
    const response = PublicProfileResponseMapper.toResponse(
      makeResult({ profile: PublicProfile.unactivated('AVAILABLE') }),
    )

    expect(response).toEqual({
      status: 'AVAILABLE',
      pet: null,
      owner: null,
      message: 'Este pingente ainda não foi ativado',
      contact_enabled: false,
      medical: null,
      contacts: [],
      location_approx: null,
    })
  })

  it('não expõe a flag interna kind', () => {
    const response = PublicProfileResponseMapper.toResponse(
      makeResult({ profile: PublicProfile.unactivated('AVAILABLE') }),
    )

    expect(response).not.toHaveProperty('kind')
  })

  it('mapeia locationApprox → location_approx (snake_case)', () => {
    const response = PublicProfileResponseMapper.toResponse(
      makeResult({ locationApprox: 'Rio de Janeiro, RJ, Brazil' }),
    )

    expect(response.location_approx).toBe('Rio de Janeiro, RJ, Brazil')
  })
})
