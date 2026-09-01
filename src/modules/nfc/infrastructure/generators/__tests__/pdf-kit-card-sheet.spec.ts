import { PdfKitCardSheetGenerator } from '../pdf-kit-card-sheet'
import { QrGenerator } from '../qr-generator'
import type { CardSheetLabel } from '../../../domain/services/card-sheet-pdf.port'

function label(publicId: string, qrPng: Buffer): CardSheetLabel {
  return {
    publicId,
    url: `https://dominio.com/p/${publicId}`,
    code: 'X8P4-L2Q9',
    qrPng,
  }
}

function countPages(buffer: Buffer): number {
  const text = buffer.toString('latin1')
  return (text.match(/\/Type\s*\/Page\b/g) ?? []).length
}

describe('PdfKitCardSheetGenerator (integração)', () => {
  const gen = new PdfKitCardSheetGenerator()
  let qrPng: Buffer

  beforeAll(async () => {
    // PNG real (via qrcode) — garante um buffer válido para o parser do pdfkit.
    qrPng = await new QrGenerator().generatePng(
      'https://dominio.com/p/AAAAAAA2',
    )
  })

  it('gera um PDF válido (magic bytes %PDF)', async () => {
    const buffer = await gen.generate([label('AAAAAAA2', qrPng)])
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('gera 1 página para até 12 cards', async () => {
    const labels = Array.from({ length: 12 }, (_, i) =>
      label(`AAAAAAA${i % 10}`, qrPng),
    )
    const buffer = await gen.generate(labels)
    expect(countPages(buffer)).toBe(1)
  })

  it('gera 2 páginas para 13 cards (ceil(N/12))', async () => {
    const labels = Array.from({ length: 13 }, (_, i) =>
      label(`AAAAAAA${i % 10}`, qrPng),
    )
    const buffer = await gen.generate(labels)
    expect(countPages(buffer)).toBe(2)
  })

  it('lança se a lista estiver vazia', async () => {
    await expect(gen.generate([])).rejects.toThrow()
  })
})
