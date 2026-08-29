# Testes Unitários — Referência Detalhada

## 1. Jest Essencial

```typescript
describe('Order', () => {
  it('should calculate total correctly', () => {
    const order = Order.create('customer-123');
    order.addItem('p1', 'Product 1', 2, Money.create(50, 'BRL'));
    order.addItem('p2', 'Product 2', 1, Money.create(100, 'BRL'));
    // 2×50 + 1×100 = 200
    expect(order.total.amount).toBe(200);
    expect(order.total.currency).toBe('BRL');
  });

  it('should not allow submitting empty order', () => {
    const order = Order.create('customer-123');
    expect(() => order.submit()).toThrow('Cannot submit an empty order');
  });
});
```

---

## 2. Testando Value Objects (DDD)

```typescript
describe('Money', () => {
  it('should not allow negative amount', () => {
    expect(() => Money.create(-50, 'BRL')).toThrow();
  });

  it('should add two amounts', () => {
    const a = Money.create(50, 'BRL');
    const b = Money.create(30, 'BRL');
    expect(a.add(b).amount).toBe(80);
  });

  it('should reject different currencies', () => {
    const a = Money.create(50, 'BRL');
    const b = Money.create(30, 'USD');
    expect(() => a.add(b)).toThrow('Currency mismatch');
  });

  it('should be equal when same value', () => {
    expect(Money.create(50, 'BRL').equals(Money.create(50, 'BRL'))).toBe(true);
  });
});
```

---

## 3. Testando Aggregate Root

```typescript
describe('Order (Aggregate)', () => {
  let order: Order;

  beforeEach(() => {
    order = Order.create('customer-123');
  });

  it('should start as draft', () => {
    expect(order.status.value).toBe('draft');
  });

  it('should emit event on submit', () => {
    order.addItem('p1', 'Prod', 1, Money.create(100, 'BRL'));
    order.submit();
    const events = order.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('order.submitted');
  });

  it('should not add items after submit', () => {
    order.addItem('p1', 'Prod', 1, Money.create(100, 'BRL'));
    order.submit();
    expect(() => order.addItem('p2', 'Prod2', 1, Money.create(50, 'BRL')))
      .toThrow('Cannot add items to a non-draft order');
  });
});
```

---

## 4. Testando Domain Service

```typescript
describe('PricingService', () => {
  const service = new PricingService();

  it('should give 10% discount to premium customers', () => {
    const order = createOrderWithTotal(1000);
    const discount = service.calculateDiscount(order, 'premium');
    expect(discount.amount).toBe(100);
  });

  it('should give free shipping above R$ 500', () => {
    const order = createOrderWithTotal(600);
    const shipping = service.calculateShipping(order, '01310');
    expect(shipping.amount).toBe(0);
  });
});
```

---

## 5. Mocks — O Que e Quando

```typescript
// Mock: simula dependência externa
const mockRepo = {
  findById: jest.fn(),
  save: jest.fn(),
};

// Stub: retorna valor fixo
mockRepo.findById.mockResolvedValue(order);

// Spy: verifica se foi chamado
await useCase.execute('order-123');
expect(mockRepo.save).toHaveBeenCalledTimes(1);
expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
  id: expect.any(OrderId),
}));
```

### Regras de Mock
- ✅ Mock de I/O: repositories, APIs externas, message brokers
- ✅ Mock de tempo: `jest.useFakeTimers()`
- ❌ NÃO mockar o que está sob teste (o aggregate)
- ❌ NÃO mockar value objects (são puros, rápidos)
- ❌ NÃO mockar domain services (são puros)

---

## 6. Test Fixtures (Fábricas de Teste)

```typescript
// Factory para criar orders nos testes
function createTestOrder(overrides?: Partial<{
  customerId: string;
  items: Array<{ productId: string; qty: number; price: number }>;
}>): Order {
  const order = Order.create(overrides?.customerId ?? 'customer-123');
  const items = overrides?.items ?? [{ productId: 'p1', qty: 1, price: 100 }];
  for (const item of items) {
    order.addItem(item.productId, 'Test Product', item.qty, Money.create(item.price, 'BRL'));
  }
  return order;
}
```
