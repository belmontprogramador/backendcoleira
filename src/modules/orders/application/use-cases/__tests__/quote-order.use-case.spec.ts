import { QuoteOrderUseCase } from '../quote-order.use-case'

describe('QuoteOrderUseCase', () => {
  const shipping = { calculateQuote: jest.fn() }
  const useCase = new QuoteOrderUseCase(shipping as never, '01310100')

  it('cota o frete normalizando o CEP de destino', async () => {
    shipping.calculateQuote.mockResolvedValue([{ id: 1, name: 'PAC' }])

    const result = await useCase.execute({
      postalCode: '01310-100',
      quantity: 2,
    })

    expect(shipping.calculateQuote).toHaveBeenCalledWith({
      fromPostalCode: '01310100',
      toPostalCode: '01310100',
      products: [expect.objectContaining({ quantity: 2 })],
    })
    expect(result).toEqual([{ id: 1, name: 'PAC' }])
  })
})
