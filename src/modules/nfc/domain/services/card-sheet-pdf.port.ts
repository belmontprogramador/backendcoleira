/**
 * Etiqueta individual da folha A4 — dados prontos para renderizar.
 * A porta não conhece Prisma nem cipher: recebe o QR já gerado e o código em
 * texto puro (montados na camada de aplicação).
 */
export interface CardSheetLabel {
  publicId: string
  /** URL pública `/p/:publicId` gravada no chip e no QR. */
  url: string
  /** Código de ativação em texto puro (nunca persistido/logado). */
  code: string
  /** PNG do QR Code (Buffer). */
  qrPng: Buffer
}

/**
 * Porta do gerador da folha A4 (PDF) de etiquetas de cards NFC.
 * Implementação: `pdfkit` (infraestrutura), layout 3×4 (12 cards/folha),
 * QR 4×4cm + código abaixo (área 6×2,5cm).
 */
export interface CardSheetPdfPort {
  generate(labels: CardSheetLabel[]): Promise<Buffer>
}

export const CARD_SHEET_PDF_PORT = Symbol('CARD_SHEET_PDF_PORT')
