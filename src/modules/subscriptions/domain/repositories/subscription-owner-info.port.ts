/**
 * Informação de exibição do dono de uma assinatura (dados do agregado User),
 * resolvida fora do agregado `Subscription` para não violar a fronteira entre
 * agregados.
 */
export interface SubscriptionOwnerInfo {
  id: string
  name: string
  email: string
}

/**
 * Porta para resolver os dados de exibição do dono (id/name/email) em lote.
 * Consumida apenas pela camada de aplicação (assembler de resposta admin).
 * Implementada na infraestrutura (consulta a tabela `users` via Prisma).
 */
export interface SubscriptionOwnerInfoPort {
  findByIds(ids: string[]): Promise<SubscriptionOwnerInfo[]>
}

export const SUBSCRIPTION_OWNER_INFO_PORT = Symbol(
  'SUBSCRIPTION_OWNER_INFO_PORT',
)
