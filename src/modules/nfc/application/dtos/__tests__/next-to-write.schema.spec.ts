import { nextToWriteSchema } from '../next-to-write.schema'

describe('nextToWriteSchema', () => {
  it('aceita sem batchId', () => {
    const result = nextToWriteSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it('aceita com batchId', () => {
    const result = nextToWriteSchema.safeParse({ batchId: 'batch-1' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ batchId: 'batch-1' })
  })

  it('rejeita batchId não-string', () => {
    const result = nextToWriteSchema.safeParse({ batchId: 123 })
    expect(result.success).toBe(false)
  })
})
