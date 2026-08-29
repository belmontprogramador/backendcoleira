import { Injectable } from '@nestjs/common'
import { customAlphabet } from 'nanoid'
import { PUBLIC_ID_ALPHABET } from '../../domain/value-objects/public-id.vo'
import type { IdGeneratorPort } from '../../domain/services/id-generator.port'

const nanoid = customAlphabet(PUBLIC_ID_ALPHABET, 8)

/**
 * Implementação do gerador de Public ID usando nanoid com alfabeto sem
 * caracteres ambíguos (sem 0, 1, I, O).
 */
@Injectable()
export class IdGenerator implements IdGeneratorPort {
  generatePublicId(): string {
    return nanoid()
  }
}
