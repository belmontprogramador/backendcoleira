# SOLID e Princípios — com NestJS e Next.js

## 1. SOLID

### S — Single Responsibility (NestJS)

```typescript
// ❌ Controller faz tudo: valida, chama DB, envia email
@Controller('orders')
class OrdersController {
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.db.orders.create(dto);      // DB direto
    await this.email.send(dto.customerId, 'Pedido criado'); // Email direto
    return order;
  }
}

// ✅ Controller só recebe, valida e delega
@Controller('orders')
class OrdersController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}

  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.createOrder.execute(dto);
  }
}
// Cada classe tem UMA razão para mudar: Controller (HTTP), UseCase (orquestração), Repository (DB)
```

### O — Open/Closed (NestJS Guards)

```typescript
// ❌ Modificar guard existente para cada nova regra
class AuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const token = context.switchToHttp().getRequest().headers.authorization;
    const user = this.auth.validate(token);
    // Adicionar regra nova = MODIFICAR esta classe aberto/fechado violado!
  }
}

// ✅ Guard base + extensão
class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return !!this.extractToken(context);
  }
}
class RoleGuard extends JwtGuard {
  canActivate(context: ExecutionContext): boolean {
    const token = this.extractToken(context);
    return super.canActivate(context) && token.role === 'admin';
  }
}
// Nova regra = novo guard. Nada é modificado.
```

### L — Liskov Substitution (Next.js API Client)

```typescript
// Interface base
interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

// Substituível sem quebrar
class FetchApiClient implements ApiClient {
  get<T>(path: string): Promise<T> {
    return fetch(`${this.base}${path}`).then(r => r.json());
  }
}
class TestApiClient implements ApiClient {
  get<T>(path: string): Promise<T> {
    return Promise.resolve(this.fixtures[path] as T); // mock
  }
}
// Trocar FetchApiClient por TestApiClient = código continua compilando e funcionando
```

### I — Interface Segregation (NestJS Repository)

```typescript
// ❌ Interface gorda obriga implementar o que não usa
interface Repository<T> {
  save(entity: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findByEmail(email: string): Promise<T | null>;  // ReadOnlyRepository não precisa
  delete(id: string): Promise<void>;               // ReadOnlyRepository não precisa
  exportToCSV(): Promise<Buffer>;                   // NINGUÉM usa no domínio
}

// ✅ Interfaces segregadas
interface ReadRepository<T> {
  findById(id: string): Promise<T | null>;
}
interface WriteRepository<T> {
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
interface ReadOrderRepository extends ReadRepository<Order> {
  findByCustomerId(customerId: string): Promise<Order[]>;
}
```

### D — Dependency Inversion (NestJS Providers)

```typescript
// ❌ Acoplado à implementação concreta
class GetOrderUseCase {
  private readonly db = new PostgresConnection(); // DEPENDÊNCIA DIRETA
  async execute(id: string): Promise<Order> {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

// ✅ Depende de abstração (port)
class GetOrderUseCase {
  constructor(
    @Inject('OrderRepositoryPort')
    private readonly repo: OrderRepositoryPort, // PORT (interface)
    @Inject('CachePort')
    private readonly cache: CachePort,           // PORT (interface)
  ) {}

  async execute(id: string): Promise<Order> {
    return this.cache.getOrSet(`order:${id}`, () => this.repo.findById(OrderId.create(id)));
  }
}

// NestJS DI amarra no último momento
@Module({
  providers: [
    GetOrderUseCase,
    { provide: 'OrderRepositoryPort', useClass: PostgresOrderRepository },
    { provide: 'CachePort', useClass: RedisCacheService },
  ],
})
class OrdersModule {}
```

---

## 2. Outros Princípios

### DRY — Next.js Layouts
```typescript
// ❌ Duplicação: header em toda página
// ❌ Duplicação: fetch de usuário em toda página

// ✅ Layout compartilhado
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); // fetch UMA vez
  return (
    <div>
      <Header user={user} />
      <Sidebar />
      <main>{children}</main> {/* páginas herdam layout */}
    </div>
  );
}
```

### KISS — Server Action Simples
```typescript
// ❌ Over-engineering: Redux + saga + 3 middlewares para um submit
// ✅ Simples: Server Action direta
'use server';
export async function submitOrder(id: string) {
  await api.orders.submit(id);
  revalidatePath(`/orders/${id}`);
}
```

### YAGNI — Não adicione antes de precisar
```typescript
// ❌ "Vou criar um BaseController genérico com CRUD, filtros, paginação, ordenação..."
//    80% nunca será usado.

// ✅ Comece simples. Extraia quando houver DOR real de duplicação.
@Controller('orders')
class OrdersController {
  @Post() create() { ... }
  @Get(':id') findById() { ... }
  @Post(':id/submit') submit() { ... }
}
```

---

## 3. Diagramas de Dependência (Visual)

### Ruim: Dependency Inversion Violada
```
┌──────────────────────┐
│   SubmitOrderUseCase │  ← Application
│   (regras + código)  │
└──────────┬───────────┘
           │ importa diretamente
           ▼
┌──────────────────────┐
│  PostgresConnection  │  ← Infrastructure
│  (host, porta, SQL)  │
└──────────────────────┘
```
Alto nível depende de baixo nível. Trocar Postgres → MySQL = reescrever Use Case.

### Bom: Dependency Inversion Aplicada
```
┌──────────────────────┐         ┌──────────────────────┐
│   SubmitOrderUseCase │         │   OrderRepositoryPort│  ← Domain (abstração)
│   (Application)      │────────→│   save() / findById()│
└──────────────────────┘         └──────────┬───────────┘
                                            │ implements
                                            ▼
                                 ┌──────────────────────┐
                                 │PostgresOrderRepository│  ← Infrastructure
                                 │  (host, porta, SQL)  │
                                 └──────────────────────┘
```
Alto nível depende de abstração. Baixo nível implementa abstração. Trocar Postgres → MySQL = novo adapter no canto inferior. Zero mudanças no Use Case.

### Fluxo de Dependência no Projeto NestJS + Next.js
```
┌──────────────────────────────────────────────────────┐
│                  INTERFACE                            │
│  NestJS Controllers (@Controller, @Get, @Post)       │
│  Next.js Pages (Server Components, Server Actions)   │
│                                                       │
│  DEPENDE DE ↓                                        │
├──────────────────────────────────────────────────────┤
│                APPLICATION                            │
│  Use Cases (CreateOrderUseCase, GetOrderUseCase)     │
│  DTOs, Input Validation                              │
│                                                       │
│  DEPENDE DE ↓ (via @Inject em ports)                 │
├──────────────────────────────────────────────────────┤
│                  DOMAIN                               │
│  Entities, Value Objects, Aggregates                  │
│  Domain Services, Domain Events                       │
│  PORTS (interfaces): OrderRepositoryPort, CachePort   │
│                                                       │
│  NÃO DEPENDE DE NADA                                 │
├──────────────────────────────────────────────────────┤
│              INFRASTRUCTURE                           │
│  PostgresOrderRepository implements OrderRepository   │
│  RedisCacheService implements CachePort               │
│  NestJS Module: providers: [{ provide: PORT, use: IMPL }] │
│                                                       │
│  DEPENDE DE ↓ (implementa ports do domínio)           │
└──────────────────────────────────────────────────────┘
```

### Regra visual: Setas SEMPRE para baixo. Nunca para cima.
