/**
 * Porta do gerador de códigos de ativação (código puro).
 *
 * O código em texto puro é usado UMA vez (impressão do cartão); o armazenamento
 * em banco é SEMPRE o ciphertext (via `ActivationCodeCipherPort`), nunca este
 * valor.
 */
export interface ActivationCodeGeneratorPort {
  /** Gera o código puro (XXXX-XXXX). */
  generate(): Promise<string>
}

export const ACTIVATION_CODE_GENERATOR_PORT = Symbol(
  'ACTIVATION_CODE_GENERATOR_PORT',
)
