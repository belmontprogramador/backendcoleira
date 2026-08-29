import { Uid, InvalidUidError } from '../uid.vo'

describe('Uid', () => {
  it('aceita UID físico no formato XX:XX:XX:XX:XX:XX', () => {
    const uid = Uid.create('04:A7:32:91:8B:1F')
    expect(uid.value).toBe('04:A7:32:91:8B:1F')
  })

  it('normaliza hex minúsculo para maiúsculo', () => {
    const uid = Uid.create('04:a7:32:91:8b:1f')
    expect(uid.value).toBe('04:A7:32:91:8B:1F')
  })

  it('rejeita formato inválido', () => {
    expect(() => Uid.create('04:A7:32:91:8B')).toThrow(InvalidUidError)
    expect(() => Uid.create('04:A7:32:91:8B:1F:00')).toThrow(InvalidUidError)
    expect(() => Uid.create('04A732918B1F')).toThrow(InvalidUidError)
  })

  it('rejeita caracteres não-hexadecimais', () => {
    expect(() => Uid.create('04:A7:32:91:8B:GG')).toThrow(InvalidUidError)
  })
})
