import { adminUpdateOrderStatusSchema } from '../admin-update-order-status.schema'

describe('adminUpdateOrderStatusSchema', () => {
  it('aceita DELIVERED/CANCELLED/REFUNDED', () => {
    for (const status of ['DELIVERED', 'CANCELLED', 'REFUNDED']) {
      expect(adminUpdateOrderStatusSchema.safeParse({ status }).success).toBe(
        true,
      )
    }
  })

  it('rejeita status fora do conjunto (ex.: PAID)', () => {
    expect(
      adminUpdateOrderStatusSchema.safeParse({ status: 'PAID' }).success,
    ).toBe(false)
  })
})
