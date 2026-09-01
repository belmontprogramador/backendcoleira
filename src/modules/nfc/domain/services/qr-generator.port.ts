/**
 * Porta do gerador de QR Code.
 * Implementação: `qrcode` (infraestrutura) gerando PNG a partir da URL.
 */
export interface QrGeneratorOptions {
  /** Largura/altura do PNG em pixels (default 300). */
  size?: number
}

export interface QrGeneratorPort {
  generatePng(url: string, options?: QrGeneratorOptions): Promise<Buffer>
}

export const QR_GENERATOR_PORT = Symbol('QR_GENERATOR_PORT')
