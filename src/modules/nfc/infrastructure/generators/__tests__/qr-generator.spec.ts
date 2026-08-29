import { QrGenerator } from '../qr-generator'

describe('QrGenerator (integração)', () => {
  it('gera PNG a partir de uma URL', async () => {
    const gen = new QrGenerator()
    const buffer = await gen.generatePng('https://dominio.com/p/7F4K9M2Q')

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
    // assinatura PNG
    expect(buffer.subarray(0, 4).toString('hex')).toBe('89504e47')
  })
})
