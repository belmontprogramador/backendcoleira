import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import type {
  CardSheetLabel,
  CardSheetPdfPort,
} from '../../domain/services/card-sheet-pdf.port'

/**
 * Dimensões (D1 — decisão do Belmont):
 * - A4 retrato 210×297mm, margem 10mm → área útil 190×277mm.
 * - QR 4×4cm; faixa do código 6×2,5cm logo abaixo → célula 6×6,5cm.
 * - Grid 3 colunas × 4 linhas = 12 cards por folha.
 */
const MM = 72 / 25.4 // pontos por milímetro
const PAGE_W = 210 * MM
const PAGE_H = 297 * MM
const MARGIN = 10 * MM
const CELL_W = 60 * MM
const CELL_H = 65 * MM
const QR_SIZE = 40 * MM
const CODE_H = 25 * MM
const COLS = 3
const ROWS = 4
const PER_PAGE = COLS * ROWS

/**
 * Implementação da folha A4 em PDF usando `pdfkit`.
 * Node puro (sem Chromium), posicionamento em milímetros exato.
 */
@Injectable()
export class PdfKitCardSheetGenerator implements CardSheetPdfPort {
  async generate(labels: CardSheetLabel[]): Promise<Buffer> {
    if (labels.length === 0) {
      throw new Error('Card sheet: nenhuma etiqueta para gerar.')
    }

    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      layout: 'portrait',
      autoFirstPage: false,
    })

    const chunks: Buffer[] = []
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    labels.forEach((label, i) => {
      const slot = i % PER_PAGE
      if (slot === 0) {
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 })
      }

      const col = slot % COLS
      const row = Math.floor(slot / COLS)

      const cellX = MARGIN + col * CELL_W
      const cellY = MARGIN + row * CELL_H

      // QR 4×4cm, centralizado horizontalmente na célula.
      const qrX = cellX + (CELL_W - QR_SIZE) / 2
      doc.image(label.qrPng, qrX, cellY, {
        width: QR_SIZE,
        height: QR_SIZE,
      })

      // Código de ativação na faixa 6×2,5cm logo abaixo do QR.
      const codeY = cellY + QR_SIZE
      doc
        .font('Courier-Bold')
        .fontSize(16)
        .fillColor('#000000')
        .text(label.code, cellX, codeY + 5 * MM, {
          width: CELL_W,
          align: 'center',
        })

      // PublicId pequeno para conferência.
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#666666')
        .text(label.publicId, cellX, codeY + CODE_H - 9, {
          width: CELL_W,
          align: 'center',
        })
    })

    doc.end()
    return done
  }
}
