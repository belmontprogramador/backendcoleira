# Testes de Integração — Referência Detalhada

## 1. O que Testar em Integração

Testar módulos REAIS juntos. Com DB real. Com cache real. Sem mocks nas dependências externas.

```
✅ Controller → Use Case → Repository → PostgreSQL REAL
✅ Cache → Redis REAL
✅ API → outro serviço (via Pact ou WireMock)
```

---

## 2. NestJS Testing Module

```typescript
describe('OrdersController (Integration)', () => {
  let app: INestApplication;
  let repository: OrderRepositoryPort;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [testConfig] }),
        TypeOrmModule.forRootAsync(testDbConfig),
        TypeOrmModule.forFeature([OrderEntity]),
        RedisModule.forRoot(testRedisConfig),
      ],
      controllers: [OrdersController],
      providers: [
        CreateOrderUseCase, GetOrderUseCase, SubmitOrderUseCase,
        PricingService,
        { provide: 'OrderRepositoryPort', useClass: PostgresOrderRepository },
        { provide: 'CachePort', useClass: RedisCacheService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    repository = module.get('OrderRepositoryPort');
  });

  it('POST /orders → 201 + order persisted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ customerId: 'cust-1', items: [{ productId: 'p1', productName: 'Prod', quantity: 1, unitPrice: 100 }] })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('draft');

    // Verifica se realmente persistiu no DB
    const saved = await repository.findById(OrderId.create(res.body.id));
    expect(saved).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 3. Test Containers (PostgreSQL e Redis Reais)

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

let pgContainer: PostgreSqlContainer;
let redisContainer: RedisContainer;

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .start();

  redisContainer = await new RedisContainer('redis:7-alpine')
    .withPassword('test')
    .start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = redisContainer.getConnectionUrl();
}, 60000);

afterAll(async () => {
  await pgContainer?.stop();
  await redisContainer?.stop();
});
```
Garante que testes rodam contra PostgreSQL e Redis REAIS. Sem surpresas em produção.

---

## 4. Limpeza entre Testes

```typescript
beforeEach(async () => {
  // Truncar tabelas, não dropar schema
  await db.query('TRUNCATE orders, outbox CASCADE');
  await redis.flushDb();
});
```

---

## 5. Testando Eventos (Outbox + Kafka)

```typescript
it('should persist event in outbox on submit', async () => {
  const order = createTestOrderWithItems();
  await repository.save(order);
  order.submit();
  await repository.save(order);

  const outboxEntries = await db.query('SELECT * FROM outbox WHERE aggregate_id = $1', [order.id.value]);
  expect(outboxEntries).toHaveLength(1);
  expect(outboxEntries[0].event_type).toBe('order.submitted');
});
```
