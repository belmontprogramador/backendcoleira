import { Uid, InvalidUidError } from '../uid.vo'

describe('Uid', () => {
  it('aceita UID físico no formato XX:XX:XX:XX:XX:XX', () => {
    const uid = Uid.create('04:A7:32:91:8B:1F')
    expect(uid.value).toBe('04:A7:32:91:8B:1F')
  })

  it('aceita UID de 7 bytes (NTAG215)', () => {
    const uid = Uid.create('04:A7:32:91:8B:1F:00')
    expect(uid.value).toBe('04:A7:32:91:8B:1F:00')
  })

  it('normaliza hex minúsculo para maiúsculo', () => {
    const uid = Uid.create('04:a7:32:91:8b:1f')
    expect(uid.value).toBe('04:A7:32:91:8B:1F')
  })

  it('normaliza hex cru do Web NFC (serialNumber sem separador)', () => {
    const uid = Uid.create('04A732918B1F')
    expect(uid.value).toBe('04:A7:32:91:8B:1F')
  })

  it('normaliza hex cru de 7 bytes', () => {
    const uid = Uid.create('04A732918B1F00')
    expect(uid.value).toBe('04:A7:32:91:8B:1F:00')
  })

  it('rejeita formato inválido', () => {
    expect(() => Uid.create('04:A7:32:91:8B')).toThrow(InvalidUidError)
    expect(() => Uid.create('04:A7:32:91:8B:1F:00:11')).toThrow(InvalidUidError)
  })

  it('rejeita caracteres não-hexadecimais', () => {
    expect(() => Uid.create('04:A7:32:91:8B:GG')).toThrow(InvalidUidError)
    expect(() => Uid.create('04A732918B1G')).toThrow(InvalidUidError)
  })
})
