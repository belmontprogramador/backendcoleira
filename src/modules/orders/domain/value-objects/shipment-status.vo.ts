export const SHIPMENT_STATUS_VALUES = [
  'PENDING',
  'POSTED',
  'DELIVERED',
  'CANCELLED',
] as const

export type ShipmentStatus = (typeof SHIPMENT_STATUS_VALUES)[number]

/**
 * Estado do envio (etiqueta Melhor Envio), espelha o enum `ShipmentStatus`.
 * No MVP o envio é manual: o admin gera a etiqueta no painel da ME e confirma
 * a postagem (PENDING → POSTED); a entrega (POSTED → DELIVERED) vem do webhook
 * da ME ou do ajuste manual do admin.
 */
export function isShipmentStatus(value: string): value is ShipmentStatus {
  return (SHIPMENT_STATUS_VALUES as readonly string[]).includes(value)
}
