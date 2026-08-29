import { IdGenerator } from '../id-generator'
import {
  PublicId,
  PUBLIC_ID_ALPHABET,
} from '../../../domain/value-objects/public-id.vo'

describe('IdGenerator (integração)', () => {
  it('gera Public IDs válidos de 8 caracteres', () => {
    const gen = new IdGenerator()
    for (let i = 0; i < 100; i++) {
      const id = gen.generatePublicId()
      expect(id).toHaveLength(8)
      // valida pelo VO (não lança)
      expect(() => PublicId.create(id)).not.toThrow()
    }
  })

  it('gera IDs com apenas caracteres do alfabeto permitido', () => {
    const gen = new IdGenerator()
    for (let i = 0; i < 100; i++) {
      const id = gen.generatePublicId()
      for (const c of id) {
        expect(PUBLIC_ID_ALPHABET).toContain(c)
      }
    }
  })

  it('gera IDs distintos', () => {
    const gen = new IdGenerator()
    const ids = new Set(
      Array.from({ length: 1000 }, () => gen.generatePublicId()),
    )
    expect(ids.size).toBe(1000)
  })
})
