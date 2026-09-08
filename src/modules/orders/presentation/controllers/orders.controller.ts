import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case'
import { ListMyOrdersUseCase } from '../../application/use-cases/list-my-orders.use-case'
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case'
import { TrackOrderUseCase } from '../../application/use-cases/track-order.use-case'
import { QuoteOrderUseCase } from '../../application/use-cases/quote-order.use-case'
import { OrderResponseMapper } from '../../application/mappers/order-response.mapper'
import { createOrderSchema } from '../../application/dtos/create-order.schema'
import type { CreateOrderDto } from '../../application/dtos/create-order.schema'
import { listOrdersSchema } from '../../application/dtos/list-orders.schema'
import type { ListOrdersDto } from '../../application/dtos/list-orders.schema'
import { quoteOrderSchema } from '../../application/dtos/quote-order.schema'
import type { QuoteOrderDto } from '../../application/dtos/quote-order.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { Public } from '../../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas da venda para o cliente autenticado (`/orders`).
 *
 * - `POST /orders/quote` — cotação de frete (público, pré-checkout).
 * - `POST /orders`       — cria a venda (USER) + pagamento MP.
 * - `GET /orders/me`     — lista pedidos do cliente.
 * - `GET /orders/me/:id` — detalhe + rastreio (ownership anti-IDOR).
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly listMyOrders: ListMyOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly trackOrder: TrackOrderUseCase,
    private readonly quoteOrder: QuoteOrderUseCase,
  ) {}

  @Public()
  @Post('quote')
  async quote(
    @Body(new ZodValidationPipe(quoteOrderSchema)) body: QuoteOrderDto,
  ) {
    return this.quoteOrder.execute({
      postalCode: body.postalCode,
      quantity: body.quantity,
    })
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderDto,
  ) {
    return this.createOrder.execute({
      buyerId: user.sub,
      buyerEmail: user.email,
      productId: body.productId,
      quantity: body.quantity,
      shipTo: body.shipTo,
      freightServiceId: body.freightServiceId,
      paymentMethod: body.paymentMethod,
      cardToken: body.cardToken,
      cardPaymentMethodId: body.cardPaymentMethodId,
      cardInstallments: body.cardInstallments,
      cardIssuerId: body.cardIssuerId,
      payerIdentificationType: body.payerIdentificationType,
      payerIdentificationNumber: body.payerIdentificationNumber,
      payerFirstName: body.payerFirstName,
      payerLastName: body.payerLastName,
      referralCode: body.referralCode,
    })
  }

  @Get('me')
  async mine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listOrdersSchema)) query: ListOrdersDto,
  ) {
    const result = await this.listMyOrders.execute({
      buyerId: user.sub,
      page: query.page,
      limit: query.limit,
    })
    return {
      data: result.data.map(OrderResponseMapper.toResponse),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    }
  }

  @Get('me/:id')
  async detail(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const order = await this.getOrder.execute({ orderId: id, viewerId: user.sub })
    const tracking = await this.trackOrder.execute({ orderId: id })
    return { ...OrderResponseMapper.toResponse(order), tracking }
  }
}
