import { Injectable } from '@nestjs/common'
import { randomInt } from 'node:crypto'
import { ACTIVATION_CODE_ALPHABET } from '../../domain/value-objects/activation-code.vo'
import type { ActivationCodeGeneratorPort } from '../../domain/services/activation-code-generator.port'

/**
 * Implementação do gerador de código de ativação.
 * Gera `XXXX-XXXX` (alfabeto sem ambíguos). Não faz hash nem criptografia —
 * a criptografia é responsabilidade do `ActivationCodeCipherPort`.
 */
@Injectable()
export class ActivationCodeGenerator implements ActivationCodeGeneratorPort {
  generate(): Promise<string> {
    return Promise.resolve(this.generateCode())
  }

  private generateCode(): string {
    const pick = (): string =>
      ACTIVATION_CODE_ALPHABET[randomInt(ACTIVATION_CODE_ALPHABET.length)]

    const first = Array.from({ length: 4 }, pick).join('')
    const second = Array.from({ length: 4 }, pick).join('')
    return `${first}-${second}`
  }
}
