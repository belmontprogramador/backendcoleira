import { reportNfcWriteSchema } from '../report-nfc-write.schema'

describe('reportNfcWriteSchema', () => {
  it('aceita um report válido', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      uid: '04:A7:32:91:8B:1F',
      matched: true,
    })
    expect(result.success).toBe(true)
  })

  it('aceita uid ausente (opcional — Web NFC sem serialNumber)', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      matched: true,
    })
    expect(result.success).toBe(true)
  })

  it('aceita uid de 7 bytes (NTAG215)', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      uid: '04:A7:32:91:8B:1F:00',
      matched: true,
    })
    expect(result.success).toBe(true)
  })

  it('aceita uid em hex cru (serialNumber do Web NFC)', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      uid: '04A732918B1F',
      matched: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita publicId vazio', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '',
      uid: '04:A7:32:91:8B:1F',
      matched: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita uid fora do formato (5 bytes)', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      uid: '04:A7:32:91:8B',
      matched: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita matched que não seja boolean', () => {
    const result = reportNfcWriteSchema.safeParse({
      publicId: '7F4K9M2Q',
      uid: '04:A7:32:91:8B:1F',
      matched: 'yes',
    })
    expect(result.success).toBe(false)
  })
})
