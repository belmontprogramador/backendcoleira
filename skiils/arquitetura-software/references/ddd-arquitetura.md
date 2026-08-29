# DDD e Arquitetura — Referência Detalhada

> "A arquitetura serve ao domínio. O domínio NÃO serve à arquitetura."

## 1. Camadas DDD (The DDD Layered Architecture)

```
┌──────────────────────────────────────┐
│           INTERFACE                  │  ← REST Controllers, GraphQL Resolvers, CLI
│  NestJS Controllers, Next.js Pages   │     Depende de: Application
├──────────────────────────────────────┤
│           APPLICATION                │  ← Use Cases, Command/Query Handlers
│  CreateOrderUseCase                  │     Orquestra o domínio. NÃO contém regras.
│  GetOrderUseCase                    │     Depende de: Domain (ports)
├──────────────────────────────────────┤
│           DOMAIN (O Coração)          │  ← Entities, VOs, Aggregates, Domain Services,
│  Order, Money, PricingService        │     Domain Events, Ports (interfaces)
│  OrderRepositoryPort, CachePort      │     NÃO depende de NADA externo
├──────────────────────────────────────┤
│         INFRASTRUCTURE               │  ← PostgreSQL, Redis, Kafka, HTTP clients
│  PostgresOrderRepository             │     Implementa Ports do Domain
│  RedisCacheService, KafkaEventBus    │     Depende de: Domain (ports)
└──────────────────────────────────────┘
```

### Regra da Dependência (Sagrada)
> **Dependências sempre apontam para baixo.** Interface → Application → Domain. Infra → Domain. Domain não aponta para NINGUÉM.

```typescript
// ✅ DOMAIN: define o QUE (interface pura, sem dependências externas)
interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// ✅ APPLICATION: usa a abstração (injetada)
class SubmitOrderUseCase {
  constructor(@Inject('OrderRepositoryPort') private readonly repo: OrderRepositoryPort) {}
  async execute(id: string): Promise<void> {
    const order = await this.repo.findById(OrderId.create(id));
    order.submit();
    await this.repo.save(order);
  }
}

// ✅ INFRA: implementa o COMO
class PostgresOrderRepository implements OrderRepositoryPort {
  async save(order: Order): Promise<void> { /* TypeORM */ }
  async findById(id: OrderId): Promise<Order | null> { /* SELECT */ }
}

// ✅ NestJS DI: amarra tudo (infra module)
@Module({
  providers: [
    { provide: 'OrderRepositoryPort', useClass: PostgresOrderRepository },
    SubmitOrderUseCase,
  ],
})
class OrdersModule {}
```

**Resultado concreto:** trocar PostgreSQL por MongoDB = 1 novo adapter. ZERO mudanças no domínio e application.

---

## 2. Hexagonal (Ports & Adapters) — Aplicado ao DDD

No DDD, Hexagonal é a implementação NATURAL do desacoplamento.

```
               DRIVING SIDE (primário)
               Quem INICIA ações no domínio
          ┌─────────────────────────────┐
  REST ───┤ Port: OrderControllerPort   │  (interface definida pelo domínio)
  CLI  ───┤                             │
  Test ───┤          DOMAIN             │
          │                             │
          ├── Port: OrderRepositoryPort ──→ PostgreSQL Adapter
          ├── Port: CachePort          ──→ Redis Adapter
          ├── Port: EventBusPort       ──→ Kafka Adapter
          └─────────────────────────────┘
               DRIVEN SIDE (secundário)
               Quem o domínio CHAMA
```

**No DDD, ports são SEMPRE definidos no domínio.** O domínio diz "eu preciso salvar pedidos" (port). A infra diz "aqui está como salvo em PostgreSQL" (adapter).

---

## 3. Clean Architecture + DDD

Clean Architecture e DDD são COMPLEMENTARES. O centro da Clean Architecture é o DOMAIN do DDD.

```
┌────────────────────────────────────────┐
│        Frameworks & Drivers             │  ← NestJS, TypeORM, React
│  ┌──────────────────────────────────┐   │
│  │    Interface Adapters            │   │  ← Controllers, Gateways, Repos
│  │  ┌──────────────────────────┐    │   │
│  │  │   Application (Use Cases)│    │   │  ← Orquestração
│  │  │  ┌──────────────────┐   │    │   │
│  │  │  │     DOMAIN       │   │    │   │  ← DDD: Entities, VOs, Aggregates
│  │  │  │  (DDD Tático)    │   │    │   │
│  │  │  └──────────────────┘   │    │   │
│  │  └──────────────────────────┘    │   │
│  └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### Mapeamento DDD → Clean Architecture
| DDD | Clean Architecture |
|-----|-------------------|
| Entities, VOs, Aggregates | Entities (inner circle) |
| Domain Services | Entities / Use Cases |
| Application Services (Use Cases) | Use Cases (second circle) |
| Ports | Interface Adapters boundary |
| Adapters (Repository impl) | Interface Adapters (third circle) |
| Controllers, NestJS | Frameworks & Drivers (outer circle) |

---

## 4. Vertical Slice + DDD (Combinação Poderosa)

Vertical Slice organiza por FEATURE. DDD modela o DOMÍNIO. Juntos:

```
Feature: CreateOrder
├── create-order.controller.ts        # Interface (NestJS)
├── create-order.use-case.ts          # Application
├── order.aggregate.ts                # Domain (Aggregate Root)
├── order-item.entity.ts              # Domain (Entity)
├── money.vo.ts                       # Domain (Value Object)
├── order.repository.port.ts          # Domain (Port)
└── postgres-order.repository.ts      # Infrastructure (Adapter)
```

**Vantagem:** TUDO sobre "criar pedido" está junto. Muda junto. Deploya junto.

**DDD + Vertical Slice é nossa arquitetura padrão.** NestJS (interface) → Use Case (application) → Domain (DDD) → Ports → Infra adapters.

---

## 5. Service Mesh em Arquitetura DDD

Quando você tem múltiplos Bounded Contexts deployados como serviços:

```
[Vendas Service] ──mTLS──→ [Estoque Service]
       │                         │
       └────mTLS────→ [Faturamento Service]
```

- **Service Mesh (Istio/Linkerd):** gerencia mTLS, retry, circuit breaker entre serviços DDD
- Cada Bounded Context = um serviço (ou módulo em Modular Monolith)
- Domain Events trafegam via Integration Events (Kafka) entre contextos

---

## 6. Tooling (Monorepo para Bounded Contexts)

```
project/
├── apps/
│   ├── api-vendas/       ← Bounded Context deploy independente
│   ├── api-estoque/      ← Bounded Context deploy independente
│   └── web/              ← Frontend
├── packages/
│   ├── shared-kernel/    ← Value Objects compartilhados
│   ├── published-language/ ← Integration Events, contratos versionados
│   └── infrastructure/   ← DB, Redis, Kafka clients
├── turbo.json
└── pnpm-workspace.yaml
```

**Turborepo + pnpm:** `turbo build --filter=api-vendas` builda só o contexto + dependências (shared-kernel, published-language). Cada Bounded Context = deploy independente. Shared Kernel e Published Language = únicos pacotes compartilhados. Sem "utils" genérico.

---

## 7. Projeto de Referência Completo

→ `../programacao` (NestJS + Next.js + PostgreSQL + Redis, código real)
