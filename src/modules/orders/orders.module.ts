import { Module } from '@nestjs/common'
import { ProductsModule } from '../products/products.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ORDER_REPOSITORY_PORT } from './domain/repositories/order.repository.port'
import { SHIPMENT_REPOSITORY_PORT } from './domain/repositories/shipment.repository.port'
import { PrismaOrderRepository } from './infrastructure/repositories/prisma-order.repository'
import { PrismaShipmentRepository } from './infrastructure/repositories/prisma-shipment.repository'
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case'
import { PayOrderWebhookUseCase } from './application/use-cases/pay-order-webhook.use-case'
import { ShipOrderUseCase } from './application/use-cases/ship-order.use-case'
import { TrackOrderUseCase } from './application/use-cases/track-order.use-case'
import { GetOrderUseCase } from './application/use-cases/get-order.use-case'
import { ListMyOrdersUseCase } from './application/use-cases/list-my-orders.use-case'
import { ListAllOrdersUseCase } from './application/use-cases/list-all-orders.use-case'
import { QuoteOrderUseCase } from './application/use-cases/quote-order.use-case'
import { AdminGetOrderUseCase } from './application/use-cases/admin-get-order.use-case'
import { AdminUpdateOrderStatusUseCase } from './application/use-cases/admin-update-order-status.use-case'
import { ProcessShippingWebhookUseCase } from './application/use-cases/process-shipping-webhook.use-case'
import { OrdersController } from './presentation/controllers/orders.controller'
import { AdminOrdersController } from './presentation/controllers/admin-orders.controller'
import { OrderWebhookController } from './presentation/controllers/order-webhook.controller'
import { ShippingWebhookController } from './presentation/controllers/shipping-webhook.controller'

/**
 * Módulo de vendas (checkout do pingente).
 *
 * Reusa o gateway de pagamento (`PAYMENT_GATEWAY_PORT`) do `SubscriptionsModule`
 * e o catálogo (`PRODUCT_REPOSITORY_PORT`) do `ProductsModule`. O gateway de
 * frete (`SHIPPING_GATEWAY_PORT`) e o validador de webhook ME vêm do
 * `ShippingModule` (@Global). Provê as portas de persistência de `Order`/`Shipment`.
 */
@Module({
  imports: [ProductsModule, SubscriptionsModule],
  controllers: [
    OrdersController,
    AdminOrdersController,
    OrderWebhookController,
    ShippingWebhookController,
  ],
  providers: [
    PrismaOrderRepository,
    { provide: ORDER_REPOSITORY_PORT, useClass: PrismaOrderRepository },
    PrismaShipmentRepository,
    { provide: SHIPMENT_REPOSITORY_PORT, useClass: PrismaShipmentRepository },
    CreateOrderUseCase,
    PayOrderWebhookUseCase,
    ShipOrderUseCase,
    TrackOrderUseCase,
    GetOrderUseCase,
    ListMyOrdersUseCase,
    ListAllOrdersUseCase,
    QuoteOrderUseCase,
    AdminGetOrderUseCase,
    AdminUpdateOrderStatusUseCase,
    ProcessShippingWebhookUseCase,
  ],
})
export class OrdersModule {}
