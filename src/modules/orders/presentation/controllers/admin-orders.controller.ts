import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ListAllOrdersUseCase } from '../../application/use-cases/list-all-orders.use-case'
import { AdminGetOrderUseCase } from '../../application/use-cases/admin-get-order.use-case'
import { ShipOrderUseCase } from '../../application/use-cases/ship-order.use-case'
import { TrackOrderUseCase } from '../../application/use-cases/track-order.use-case'
import { AdminUpdateOrderStatusUseCase } from '../../application/use-cases/admin-update-order-status.use-case'
import { OrderResponseMapper } from '../../application/mappers/order-response.mapper'
import { listOrdersSchema } from '../../application/dtos/list-orders.schema'
import type { ListOrdersDto } from '../../application/dtos/list-orders.schema'
import { shipOrderSchema } from '../../application/dtos/ship-order.schema'
import type { ShipOrderDto } from '../../application/dtos/ship-order.schema'
import { adminUpdateOrderStatusSchema } from '../../application/dtos/admin-update-order-status.schema'
import type { AdminUpdateOrderStatusDto } from '../../application/dtos/admin-update-order-status.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de vendas (`/admin/orders`) — ADMIN+.
 *
 * - `GET /admin/orders`           — todas as vendas (filtro status, paginação).
 * - `GET /admin/orders/:id`       — detalhe (auditoria).
 * - `POST /admin/orders/:id/ship` — despacho (PAID → SHIPPED + etiqueta manual).
 * - `PATCH /admin/orders/:id/status` — ajuste manual (DELIVERED/CANCELLED/REFUNDED).
 */
@Controller('admin/orders')
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(
    private readonly listAll: ListAllOrdersUseCase,
    private readonly getOrder: AdminGetOrderUseCase,
    private readonly ship: ShipOrderUseCase,
    private readonly trackOrder: TrackOrderUseCase,
    private readonly updateStatus: AdminUpdateOrderStatusUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listOrdersSchema)) query: ListOrdersDto,
  ) {
    const result = await this.listAll.execute({
      page: query.page,
      limit: query.limit,
      status: query.status,
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

  @Get(':id')
  async detail(@Param('id') id: string) {
    const order = await this.getOrder.execute({ orderId: id })
    const tracking = await this.trackOrder.execute({ orderId: id })
    return { ...OrderResponseMapper.toResponse(order), tracking }
  }

  @Post(':id/ship')
  async shipRoute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shipOrderSchema)) body: ShipOrderDto,
  ) {
    return this.ship.execute({
      orderId: id,
      actorId: user.sub,
      meOrderId: body.meOrderId,
      protocol: body.protocol,
      serviceId: body.serviceId,
      tracking: body.tracking,
      trackingUrl: body.trackingUrl,
      labelUrl: body.labelUrl,
      document: body.document,
    })
  }

  @Patch(':id/status')
  async patchStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateOrderStatusSchema))
    body: AdminUpdateOrderStatusDto,
  ) {
    return this.updateStatus.execute({
      orderId: id,
      actorId: user.sub,
      status: body.status,
    })
  }
}
