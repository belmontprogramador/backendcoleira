import type { ShippingProduct } from '../../../../common/ports/shipping-gateway.port'

/**
 * Dimensões/peso do pingente para cotação de frete (embalagem padrão).
 * O catálogo `Product` não guarda dimensões — a embalagem é fixa no MVP.
 * Valores placeholder (cm / kg) — Belmont deve confirmar as medidas reais.
 */
export const PINGENTE_PACKAGE: ShippingProduct = {
  id: 'pingente',
  width: 15,
  height: 20,
  length: 5,
  weight: 0.2,
  insuranceValue: 0,
  quantity: 1,
}
