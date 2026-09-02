import { PublicProfile } from '../public-profile.vo'
import type { PublicProfileJson } from '../public-profile.vo'
import { Pet } from '../../../../pets/domain/entities/pet.entity'
import { PetSpecies } from '../../../../pets/domain/value-objects/pet-species.vo'
import { User } from '../../../../users/domain/entities/user.entity'
import { Email } from '../../../../users/domain/value-objects/email.vo'

describe('PublicProfile (value object)', () => {
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

  describe('active', () => {
    it('mantém os campos Basic do pet sempre visíveis', () => {
      const profile = PublicProfile.active(makePet(), makeOwner())

      expect(profile.isActive).toBe(true)
      expect(profile.kind).toBe('ACTIVE')
      expect(profile.status).toBe('ACTIVE')
      expect(profile.message).toBeNull()
      expect(profile.pet).toEqual({
        name: 'Thor',
        species: 'Cão',
        breed: 'Shih Tzu',
        sex: 'MALE',
        photoUrl: 'https://storage.example.com/pets/thor.jpg',
        description: 'Muito carinhoso',
        city: 'Araruama - RJ',
        lostStatus: false,
      })
    })

    it('expõe o nome do tutor sempre', () => {
      const profile = PublicProfile.active(makePet(), makeOwner())
      expect(profile.owner?.name).toBe('João Silva')
    })

    it('expõe telefone e email por padrão (show_phone = true, show_email = true)', () => {
      const profile = PublicProfile.active(makePet(), makeOwner())

      expect(profile.owner?.phone).toBe('(21) 99999-9999')
      expect(profile.owner?.email).toBe('joao@example.com')
    })

    it('oculta o telefone quando show_phone = false', () => {
      const pet = makePet()
      pet.updatePrivacy({ showPhone: false })

      const profile = PublicProfile.active(pet, makeOwner())

      expect(profile.owner?.phone).toBeNull()
      expect(profile.owner?.name).toBe('João Silva')
    })

    it('oculta o email quando show_email = false', () => {
      const pet = makePet()
      pet.updatePrivacy({ showEmail: false })

      const profile = PublicProfile.active(pet, makeOwner())

      expect(profile.owner?.email).toBeNull()
    })

    it('oculta a cidade quando show_city = false', () => {
      const pet = makePet()
      pet.updatePrivacy({ showCity: false })

      const profile = PublicProfile.active(pet, makeOwner())

      expect(profile.pet?.city).toBeNull()
    })

    it('reflete o status de perdido', () => {
      const pet = makePet()
      pet.markLost()

      const profile = PublicProfile.active(pet, makeOwner())

      expect(profile.pet?.lostStatus).toBe(true)
    })

    it('não expõe hash de senha, email administrativo nem dados de ativação', () => {
      const profile = PublicProfile.active(makePet(), makeOwner())

      const serialized = JSON.stringify(profile)
      expect(serialized).not.toContain('password_hash')
      expect(serialized).not.toContain('activation_code_encrypted')
      expect(serialized).not.toContain('hash')
    })
  })

  describe('unactivated', () => {
    it('representa um pingente sem pet ativo', () => {
      const profile = PublicProfile.unactivated('AVAILABLE')

      expect(profile.isActive).toBe(false)
      expect(profile.kind).toBe('UNAVAILABLE')
      expect(profile.status).toBe('AVAILABLE')
      expect(profile.pet).toBeNull()
      expect(profile.owner).toBeNull()
      expect(profile.message).toBe('Este pingente ainda não foi ativado')
    })

    it('preserva o status real da tag', () => {
      const profile = PublicProfile.unactivated('DELIVERED')
      expect(profile.status).toBe('DELIVERED')
    })
  })

  describe('serialização (cache)', () => {
    it('serializa para um objeto puro (sem entidades)', () => {
      const json = PublicProfile.active(makePet(), makeOwner()).toJSON()

      expect(json.kind).toBe('ACTIVE')
      expect(json.status).toBe('ACTIVE')
      expect(json.pet?.name).toBe('Thor')
      expect(json.pet?.species).toBe('Cão')
      expect(json.owner?.name).toBe('João Silva')
      expect(json.message).toBeNull()
    })

    it('faz round-trip de um perfil ativo', () => {
      const original = PublicProfile.active(makePet(), makeOwner())

      const restored = PublicProfile.fromJSON(
        JSON.parse(JSON.stringify(original.toJSON())) as PublicProfileJson,
      )

      expect(restored.kind).toBe('ACTIVE')
      expect(restored.isActive).toBe(true)
      expect(restored.pet?.name).toBe('Thor')
      expect(restored.pet?.city).toBe('Araruama - RJ')
      expect(restored.owner?.name).toBe('João Silva')
      expect(restored.owner?.phone).toBe('(21) 99999-9999')
      expect(restored.owner?.email).toBe('joao@example.com')
    })

    it('faz round-trip de um perfil não ativado', () => {
      const original = PublicProfile.unactivated('AVAILABLE')

      const restored = PublicProfile.fromJSON(
        JSON.parse(JSON.stringify(original.toJSON())) as PublicProfileJson,
      )

      expect(restored.isActive).toBe(false)
      expect(restored.status).toBe('AVAILABLE')
      expect(restored.pet).toBeNull()
      expect(restored.owner).toBeNull()
      expect(restored.message).toBe('Este pingente ainda não foi ativado')
    })
  })
})
