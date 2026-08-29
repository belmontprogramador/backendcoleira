/**
 * Porta de geração de senha aleatória segura.
 * DIP: a aplicação depende desta abstração. A implementação usa `node:crypto`.
 */
export interface PasswordGeneratorPort {
  generate(): string
}

export const PASSWORD_GENERATOR_PORT = Symbol('PASSWORD_GENERATOR_PORT')
