import { InvalidShipToError, ShipTo } from '../ship-to.vo'
import type { ShipToProps } from '../ship-to.vo'

const valid: ShipToProps = {
  postalCode: '01310-100',
  street: 'Av. Paulista',
  number: '1000',
  city: 'São Paulo',
  state: 'sp',
  name: 'Fulano de Tal',
  phone: '(11) 99999-9999',
}

describe('ShipTo', () => {
  it('normaliza CEP (remove máscara) e UF (uppercase)', () => {
    const shipTo = ShipTo.create(valid)
    expect(shipTo.postalCode).toBe('01310100')
    expect(shipTo.state).toBe('SP')
  })

  it('rejeita CEP inválido', () => {
    expect(() => ShipTo.create({ ...valid, postalCode: '123' })).toThrow(
      InvalidShipToError,
    )
  })

  it('rejeita UF inválida', () => {
    expect(() => ShipTo.create({ ...valid, state: 'SPX' })).toThrow(
      InvalidShipToError,
    )
  })

  it('rejeita campo obrigatório vazio', () => {
    expect(() => ShipTo.create({ ...valid, name: '   ' })).toThrow(
      InvalidShipToError,
    )
  })

  it('compara igualdade por valor', () => {
    const a = ShipTo.create(valid)
    const b = ShipTo.create(valid)
    expect(a.equals(b)).toBe(true)

    const c = ShipTo.create({ ...valid, number: '2000' })
    expect(a.equals(c)).toBe(false)
  })
})
