import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import type { PasswordGeneratorPort } from '../../common/ports/password-generator.port'

/** Alfabeto sem caracteres ambíguos (0/O, 1/l/I, etc.). */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const ALPHABET = LETTERS + DIGITS
const LENGTH = 12

/**
 * Gera senha aleatória criptograficamente segura (12 chars, com ao menos
 * 1 letra e 1 dígito — requisito do value object `Password`).
 */
@Injectable()
export class CryptoPasswordGenerator implements PasswordGeneratorPort {
  generate(): string {
    const bytes = randomBytes(LENGTH)
    const chars = Array.from(bytes, b => ALPHABET[b % ALPHABET.length])

    // Garante 1 letra na primeira posição e 1 dígito na última.
    const extra = randomBytes(2)
    chars[0] = LETTERS[extra[0] % LETTERS.length]
    chars[LENGTH - 1] = DIGITS[extra[1] % DIGITS.length]

    return chars.join('')
  }
}
