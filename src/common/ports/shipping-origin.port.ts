/**
 * Porta do CEP de origem (remetente) para cálculo de frete na Melhor Envio.
 *
 * O CEP remetente é a sede da Elopet — vem da env `MELHOR_ENVIO_FROM_POSTAL_CODE`
 * (implementação no `ShippingModule`). A porta expõe apenas uma string para que
 * o use case de checkout (`CreateOrderUseCase`) não dependa de config concreta.
 */
export const SHIPPING_ORIGIN_POSTAL_CODE_PORT = Symbol(
  'SHIPPING_ORIGIN_POSTAL_CODE_PORT',
)
