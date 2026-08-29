import type { Pet } from '../../domain/entities/pet.entity'
import { PetOwnerMismatchError } from '../errors'

/**
 * Policy de ownership do Pet (anti-IDOR).
 *
 * Centraliza a regra "o ator deve ser o dono do pet", repetida em ~17 use
 * cases (pets, contact, access-events, pet-medical, pet-contacts, ownership).
 * Uma única fonte de verdade reduz o risco de um caso de uso esquecer o check
 * — que é justamente o vetor de IDOR.
 */
export class PetOwnership {
  static assertOwner(pet: Pet, actorId: string): void {
    if (pet.ownerId !== actorId) {
      throw new PetOwnerMismatchError()
    }
  }
}
