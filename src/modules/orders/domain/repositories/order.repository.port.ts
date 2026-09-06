import type { Order } from '../entities/order.entity'
import type { OrderStatus } from '../value-objects/order-status.vo'

/**
 * Filtro da listagem de pedidos.
 *
 * - `page`/`limit` → paginação.
 * - `status`   → status do pedido (enum `OrderStatus`) — filtro admin.
 * - `buyerId`  → dono (id do usuário) — usado pela listagem "Meus pedidos".
 */
export interface ListOrdersFilter {
  page: number
  limit: number
  status?: OrderStatus
  buyerId?: string
}

/**
 * Porta do repositório de pedidos (venda do pingente).
 * DIP: domínio/aplicação dependem desta interface; a implementação (Prisma)
 * vive na infraestrutura.
 */
export interface OrderRepositoryPort {
  save(order: Order): Promise<Order>
  findById(id: string): Promise<Order | null>
  findByPaymentId(paymentId: string): Promise<Order | null>
  list(filter: ListOrdersFilter): Promise<Order[]>
  count(filter: ListOrdersFilter): Promise<number>
}

export const ORDER_REPOSITORY_PORT = Symbol('ORDER_REPOSITORY_PORT')
