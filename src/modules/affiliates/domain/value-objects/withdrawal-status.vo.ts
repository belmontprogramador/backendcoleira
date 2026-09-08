export const WITHDRAWAL_STATUS_VALUES = [
  'RECEIVED',
  'PROCESSING',
  'PAID',
  'REJECTED',
] as const

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS_VALUES)[number]

/**
 * Ciclo de vida do saque (requisito do Belmont):
 *   RECEIVED   → solicitação recebida (aguardando análise)
 *   PROCESSING → em processamento (aprovado, aguardando pagamento)
 *   PAID       → pago
 *   REJECTED   → recusado
 *
 * O saldo disponível do afiliado desconta saques `RECEIVED | PROCESSING | PAID`
 * (não `REJECTED`, pois um saque recusado devolve o valor ao saldo).
 */
export function isWithdrawalStatus(value: string): value is WithdrawalStatus {
  return (WITHDRAWAL_STATUS_VALUES as readonly string[]).includes(value)
}

/** Transições válidas da máquina de estados de saque. */
export const WITHDRAWAL_TRANSITIONS: Record<
  WithdrawalStatus,
  WithdrawalStatus[]
> = {
  RECEIVED: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['PAID', 'REJECTED'],
  PAID: [],
  REJECTED: [],
}
