/**
 * Porta do gerador de QR Code.
 * Implementação: `qrcode` (infraestrutura) gerando PNG a partir da URL.
 */
export interface QrGeneratorPort {
  generatePng(url: string): Promise<Buffer>
}

export const QR_GENERATOR_PORT = Symbol('QR_GENERATOR_PORT')
