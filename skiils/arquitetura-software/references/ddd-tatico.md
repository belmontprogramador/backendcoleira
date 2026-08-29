# DDD Tático — Referência Detalhada

> O DDD tático responde: "Como implementar o modelo dentro de um Bounded Context?"

## 1. Value Objects (Objetos de Valor)

**Sem identidade. Imutáveis. Iguais se todos os atributos são iguais.**

```typescript
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Money cannot be negative');
    if (!['BRL', 'USD', 'EUR'].includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

**Características:**
- Imutáveis (criar novo em vez de modificar)
- Sem ID. R$ 50 é R$ 50. Duas notas de 50 são a mesma coisa.
- Auto-validação no construtor
- Substituíveis (pode trocar sem quebrar identidade)
- **Exemplos:** Money, Email, CPF, OrderId, Address, DateRange, Quantity

**Por que Value Objects?**
```typescript
// ❌ Primitive Obsession (obsessão por primitivos)
function charge(amount: number, currency: string) { ... }
charge(-50, "XYZ"); // nada impede!

// ✅ Value Object
function charge(money: Money) { ... }
charge(Money.create(50, "BRL")); // validado! money.amount nunca negativo
```

---

## 2. Entities (Entidades)

**Com identidade. Mesmo ID = mesmo objeto, mesmo que atributos diferentes.**

```typescript
class Order {
  constructor(
    public readonly id: OrderId,         // identidade
    private _status: OrderStatus,
    private _items: OrderItem[],
    private _total: Money,
    public readonly customerId: string,
    public readonly createdAt: Date,
  ) {}

  // --- Comportamentos (regras de negócio vivem AQUI) ---
  addItem(productId: string, name: string, qty: number, price: Money): void {
    if (!this._status.isEditable()) throw new Error('Order is not editable');
    this._items.push(new OrderItem(productId, name, qty, price));
    this._recalculateTotal();
  }

  submit(): void {
    if (this._items.length === 0) throw new Error('Cannot submit empty order');
    this._status = OrderStatus.submitted();
    // Domain Event será adicionado aqui
  }

  // Entity NÃO expõe setters públicos. Comportamentos controlam estado.
  get status(): OrderStatus { return this._status; }
  get total(): Money { return this._total; }
}
```

**Entity vs Value Object — O Teste Definitivo:**
> Se dois objetos com os mesmos atributos são "o mesmo"? Se SIM → Value Object. Se NÃO (precisa de ID) → Entity.

```
Duas notas de R$ 50:          mesma coisa → Value Object
Duas pessoas chamadas "João": pessoas diferentes → Entity (precisa de ID)
```

---

## 3. Aggregates (Agregados)

**Grupo de entities e value objects tratados como UMA unidade transacional.**

```typescript
class Order {  // ← Aggregate ROOT (única porta de entrada)
  private _items: OrderItem[];  // entity interna
  private _total: Money;        // value object
  private _status: OrderStatus; // value object

  // ✅ Acesso EXTERNO sempre pelo Root
  addItem(...) { ... }
  get items(): ReadonlyArray<OrderItem> { return [...this._items]; }

  // ❌ NUNCA exponha coleções mutáveis internas
  // ❌ NUNCA permita modificar OrderItem direto de fora
}
```

**Regras de Ouro do Aggregate:**
1. **Root é a ÚNICA porta de entrada.** Nada de fora modifica internals.
2. **Referências externas só por ID.** `Order` referencia `customerId: string`, não `Customer` inteiro.
3. **Invariantes de negócio** são garantidas DENTRO do aggregate.
4. **Pequeno.** Se um aggregate tem 50 entities, está ERRADO. Split.
5. **Um aggregate = uma transação.** Persista o aggregate inteiro ou nada.

**Como Encontrar Aggregates:**
- O que muda junto, fica junto.
- Quais invariantes de negócio precisam ser consistentes a todo momento?
- Exemplo: `Order.total` deve sempre = soma de `OrderItem.subtotal`. Não pode ter janela onde difere → Order e OrderItem são o MESMO aggregate.

---

## 4. Domain Events (Eventos de Domínio)

**Algo importante aconteceu no domínio.** Imutável. Nome no passado.

```typescript
class OrderSubmittedEvent implements DomainEvent {
  public readonly eventName = 'order.submitted';
  public readonly occurredAt = new Date();

  constructor(
    public readonly orderId: OrderId,
    public readonly customerId: string,
    public readonly total: Money,
  ) {}
}
```

### Dentro do Aggregate
```typescript
class Order {
  private _events: DomainEvent[] = [];

  submit(): void {
    this._status = OrderStatus.submitted();
    this._events.push(new OrderSubmittedEvent(this.id, this.customerId, this._total));
  }

  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }
}
```

### Domain Event vs Integration Event
| | Domain Event | Integration Event |
|---|-------------|-------------------|
| **Escopo** | Dentro do Bounded Context | Entre Bounded Contexts |
| **Formato** | Objeto do domínio | JSON/Protobuf (contrato público) |
| **Acoplamento** | Forte (tipos do domínio) | Fraco (schema versionado) |
| **Exemplo** | `OrderSubmittedEvent` (classe) | `{ type: "order.submitted", ... }` (JSON) |

---

## 5. Repositories (Repositórios)

**Abstração para persistir e recuperar Aggregates.** Apenas Aggregate Roots têm Repository.

```typescript
// PORT (no domínio) — NÃO conhece PostgreSQL, TypeORM, nada
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  findPending(): Promise<Order[]>;
}

// ADAPTER (na infra) — implementação concreta
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    // Mapeia Order → OrderEntity (ORM) → INSERT/UPDATE
  }
  async findById(id: OrderId): Promise<Order | null> {
    // SELECT → OrderEntity → mapeia para Order (domínio)
  }
}
```

---

## 6. Domain Services (Serviços de Domínio)

**Lógica que não pertence naturalmente a uma Entity ou Value Object.**

```typescript
// "Calcular frete" não pertence a Order (frete não é propriedade do pedido)
// e não pertence a Shipping (é uma regra de negócio)
class ShippingCalculator {
  calculate(order: Order, destination: Address): Money {
    if (order.total.amount > 500) return Money.zero(); // frete grátis
    if (destination.isMetropolitan()) return Money.create(15, 'BRL');
    return Money.create(30, 'BRL');
  }
}
```

**Domain Service vs Application Service:**
| | Domain Service | Application Service (Use Case) |
|---|---------------|-------------------------------|
| **Onde** | Camada de Domínio | Camada de Aplicação |
| **Contém regras?** | SIM | NÃO (orquestra) |
| **Estado?** | Stateless | Stateless |
| **Depende de infra?** | NÃO | SIM (via ports) |

---

## 7. Factories (Fábricas)

**Encapsulam lógica complexa de criação de objetos do domínio.**

```typescript
class OrderFactory {
  static createFromQuote(quote: Quote, customer: Customer): Order {
    const order = new Order(
      OrderId.create(),
      OrderStatus.draft(),
      [],
      Money.zero(),
      customer.id,
      new Date(),
    );
    for (const line of quote.lines) {
      order.addItem(line.productId, line.productName, line.quantity, line.unitPrice);
    }
    return order;
  }
}
```

---

## 8. Módulos (Packages)

Agrupa conceitos relacionados. Baixo acoplamento entre módulos, alta coesão interna.

```
orders/
  domain/
    entities/
    value-objects/
    events/
    services/
    ports/
  application/
    use-cases/
  infrastructure/
    persistence/
    cache/
  interface/
    controllers/
```
