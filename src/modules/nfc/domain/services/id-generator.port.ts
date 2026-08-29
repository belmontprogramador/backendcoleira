/**
 * Porta do gerador de IDs curtos (Public ID).
 * Implementação: nanoid custom com alfabeto sem ambíguos (infraestrutura).
 */
export interface IdGeneratorPort {
  generatePublicId(): string
}

export const ID_GENERATOR_PORT = Symbol('ID_GENERATOR_PORT')
