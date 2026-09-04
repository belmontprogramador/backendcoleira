import {
  brPhoneSchema,
  isBrMobile,
  normalizeBrPhone,
  toWhatsAppNumber,
} from '../phone'

describe('normalizeBrPhone', () => {
  it.each([
    ['(11) 99999-9999', '+5511999999999'],
    ['+55 (11) 99999-9999', '+5511999999999'],
    ['55 11 99999-9999', '+5511999999999'],
    ['5511999999999', '+5511999999999'],
    ['11999999999', '+5511999999999'],
    ['011 99999-9999', '+5511999999999'],
    ['+5521999999999', '+5521999999999'],
    ['(11) 9999-9999', '+551199999999'],
    ['551199999999', '+551199999999'],
    ['11 9999-9999', '+551199999999'],
  ])('normaliza %s → %s', (input, expected) => {
    expect(normalizeBrPhone(input)).toBe(expected)
  })

  it.each([[''], [null], [undefined], ['abc'], ['12345'], ['+999']])(
    'retorna null para %p',
    (input) => {
      expect(normalizeBrPhone(input)).toBeNull()
    },
  )
})

describe('isBrMobile', () => {
  it('celular (14 chars, +55) é true', () => {
    expect(isBrMobile('+5511999999999')).toBe(true)
  })

  it('fixo (13 chars, +55) é false', () => {
    expect(isBrMobile('+551199999999')).toBe(false)
  })
})

describe('toWhatsAppNumber', () => {
  it('celular vira número Evolution (sem +)', () => {
    expect(toWhatsAppNumber('(11) 99999-9999')).toBe('5511999999999')
  })

  it('E.164 já normalizado vira número Evolution', () => {
    expect(toWhatsAppNumber('+5521999999999')).toBe('5521999999999')
  })

  it('fixo retorna null', () => {
    expect(toWhatsAppNumber('(11) 9999-9999')).toBeNull()
  })

  it('nulo/vazio/inválido retorna null', () => {
    expect(toWhatsAppNumber(null)).toBeNull()
    expect(toWhatsAppNumber('')).toBeNull()
    expect(toWhatsAppNumber('abc')).toBeNull()
  })
})

describe('brPhoneSchema', () => {
  it('normaliza telefone válido', () => {
    expect(brPhoneSchema.parse('(11) 99999-9999')).toBe('+5511999999999')
  })

  it('preserva E.164 já normalizado', () => {
    expect(brPhoneSchema.parse('+5521999999999')).toBe('+5521999999999')
  })

  it('aceita null → null', () => {
    expect(brPhoneSchema.parse(null)).toBeNull()
  })

  it('aceita string vazia/whitespace → null', () => {
    expect(brPhoneSchema.parse('')).toBeNull()
    expect(brPhoneSchema.parse('   ')).toBeNull()
  })

  it('rejeita telefone inválido', () => {
    expect(() => brPhoneSchema.parse('abc')).toThrow()
    expect(() => brPhoneSchema.parse('12345')).toThrow()
  })
})
