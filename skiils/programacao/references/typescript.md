# TypeScript Profundo para NestJS e Next.js

## 1. Decorators — A Fundação do NestJS

NestJS é construído sobre decorators TypeScript. Entender como eles funcionam é essencial.

```typescript
// Decorator é uma função que modifica classe/método/propriedade em tempo de design
function Controller(path: string): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('path', path, target);
    Reflect.defineMetadata('type', 'controller', target);
  };
}

function Get(path?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata('path', path ?? '', target, propertyKey);
    Reflect.defineMetadata('method', 'GET', target, propertyKey);
  };
}

function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('injectable', true, target);
  };
}

// Uso
@Controller('orders')
@Injectable()
class OrdersController {
  @Get(':id')
  findById(@Param('id') id: string): Promise<Order> { ... }
}
```

### Decorators Nativos NestJS
| Decorator | Alvo | Propósito |
|-----------|------|-----------|
| `@Module()` | Classe | Define módulo (imports, controllers, providers) |
| `@Controller()` | Classe | Define controller REST |
| `@Injectable()` | Classe | Marca como injetável (provider) |
| `@Get/@Post/@Put/@Delete/@Patch()` | Método | Roteamento HTTP |
| `@Param()` | Parâmetro | Extrai path param |
| `@Body()` | Parâmetro | Extrai body da request |
| `@Query()` | Parâmetro | Extrai query string |
| `@Headers()` | Parâmetro | Extrai headers |
| `@Req/@Res()` | Parâmetro | Request/Response raw (evite em DDD) |
| `@UseGuards()` | Classe/Método | Aplica guard |
| `@UseInterceptors()` | Classe/Método | Aplica interceptor |
| `@UsePipes()` | Classe/Método | Aplica pipe de validação |
| `@UseFilters()` | Classe/Método | Aplica exception filter |
| `@Inject()` | Construtor | Injeção por token (essencial para ports DDD) |

---

## 2. Generics Padrão em NestJS

```typescript
// Repository genérico (base para todos repositórios DDD)
interface Repository<T extends AggregateRoot> {
  save(aggregate: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
}

// TypeORM repository tipado
@Injectable()
class PostgresOrderRepository implements Repository<Order> {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
  ) {}
  async save(order: Order): Promise<void> { ... }
  async findById(id: string): Promise<Order | null> { ... }
}

// Generic Controller base
abstract class CrudController<TDto, TCreateDto> {
  protected abstract service: CrudService<TDto, TCreateDto>;

  @Get()
  findAll(): Promise<TDto[]> { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TDto> { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: TCreateDto): Promise<TDto> { return this.service.create(dto); }
}
```

---

## 3. TypeScript no Next.js (App Router)

### Server Components (padrão — sem 'use client')
```typescript
// Tipo inferido automaticamente. Sem state/effects.
export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await api.orders.getById(params.id); // fetch direto, sem useEffect
  return <OrderDetail order={order} />;
}
```

### Server Actions (mutations sem API route)
```typescript
// app/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function submitOrder(id: string): Promise<void> {
  await api.orders.submit(id);
  revalidatePath(`/orders/${id}`); // revalida cache
}

// Componente
'use client';
import { submitOrder } from './actions';

export function SubmitButton({ orderId }: { orderId: string }) {
  return (
    <button onClick={() => submitOrder(orderId)}>
      Enviar Pedido
    </button>
  );
}
```

### Tipos Compartilhados (backend ↔ frontend)
```typescript
// Shared DTOs (packages/shared/src/contracts/order.ts)
export interface OrderResponseDTO {
  id: string;
  customerId: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'delivered';
  total: { amount: number; currency: string };
  items: OrderItemDTO[];
  createdAt: string;
}

// API Client tipado
const api = {
  orders: {
    getById: (id: string): Promise<OrderResponseDTO> =>
      fetchApi(`/api/v1/orders/${id}`),
    create: (dto: CreateOrderDTO): Promise<OrderResponseDTO> =>
      fetchApi('/api/v1/orders', { method: 'POST', body: JSON.stringify(dto) }),
  },
};
```

---

## 4. Utility Types Essenciais para NestJS + Next.js

```typescript
// NestJS: DTO partial para update
type UpdateOrderDTO = Partial<CreateOrderDTO>;

// Next.js: Tipar page params
type PageProps<T extends Record<string, string> = {}> = {
  params: T;
  searchParams: { [key: string]: string | string[] | undefined };
};

// Next.js: Tipar generateStaticParams
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const orders = await api.orders.list();
  return orders.map(o => ({ id: o.id }));
}

// NestJS: Response tipada com envelope
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// NestJS: Paginação tipada
type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
```
