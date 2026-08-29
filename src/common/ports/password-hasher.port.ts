/**
 * Porta de hashing de senha.
 * DIP: a aplicação depende desta abstração. A implementação (bcrypt) é plugável.
 */
export interface PasswordHasherPort {
  hash(plain: string): Promise<string>
  compare(plain: string, hash: string): Promise<boolean>
}

export const PASSWORD_HASHER_PORT = Symbol('PASSWORD_HASHER_PORT')
