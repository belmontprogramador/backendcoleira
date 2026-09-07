import type { ShippingProduct } from '../../../../common/ports/shipping-gateway.port'

/**
 * Dimensões/peso do pingente para cotação de frete (embalagem padrão).
 * O catálogo `Product` não guarda dimensões — a embalagem é fixa no MVP.
 *
 * ⚠️ As transportadoras (Correios/Jadlog) exigem dimensões/peso mínimos para
 * cotar; abaixo disso a Melhor Envio devolve `price: null` (não cota) e a venda
 * quebra com "Preço deve ser um inteiro em centavos". Valores válidos:
 *   - comprimento (length) ≥ 16 cm — e é o MAIOR lado;
 *   - largura (width) ≥ 11 cm;
 *   - altura (height) ≥ 2 cm;
 *   - peso (weight) ≥ 0.3 kg (mínimo de faturamento das transportadoras).
 */
export const PINGENTE_PACKAGE: ShippingProduct = {
  id: 'pingente',
  name: 'Pingente Elopet',
  width: 15,
  height: 5,
  length: 20,
  weight: 0.3,
  insuranceValue: 19.9,
  unitaryValue: 19.9,
  quantity: 1,
}
