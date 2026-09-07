import type { ShippingAddress } from './shipping-gateway.port'

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

/**
 * Porta do endereço completo do remetente (sede da Elopet) para o despacho
 * (`createShipment` — carrinho Melhor Envio). Resolve para um `ShippingAddress`
 * (nome, email, telefone, endereço, cidade, UF, CEP) vindo das envs
 * `MELHOR_ENVIO_FROM_*` no `ShippingModule`.
 */
export const SHIPPING_ORIGIN_PORT = Symbol('SHIPPING_ORIGIN_PORT')
