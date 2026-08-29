# Design Patterns (GoF) — Referência Detalhada com TypeScript

## 1. Criacionais (Criação de Objetos)

### Singleton
```typescript
class Database {
  private static instance: Database;
  private constructor() {}
  static getInstance(): Database {
    if (!Database.instance) Database.instance = new Database();
    return Database.instance;
  }
}
const db = Database.getInstance();
```

### Factory Method
```typescript
abstract class Logistics {
  abstract createTransport(): Transport;
  planDelivery(): string {
    const transport = this.createTransport();
    return transport.deliver();
  }
}

class RoadLogistics extends Logistics {
  createTransport(): Transport { return new Truck(); }
}

class SeaLogistics extends Logistics {
  createTransport(): Transport { return new Ship(); }
}
```

### Abstract Factory
```typescript
interface UIFactory {
  createButton(): Button;
  createInput(): Input;
}
class MaterialFactory implements UIFactory { ... }
class BootstrapFactory implements UIFactory { ... }
```

### Builder
```typescript
class QueryBuilder {
  private table: string = "";
  private where: string[] = [];
  private order: string = "";

  from(table: string): this { this.table = table; return this; }
  addWhere(condition: string): this { this.where.push(condition); return this; }
  orderBy(column: string): this { this.order = column; return this; }
  build(): string {
    return `SELECT * FROM ${this.table}` +
      (this.where.length ? ` WHERE ${this.where.join(" AND ")}` : "") +
      (this.order ? ` ORDER BY ${this.order}` : "");
  }
}
```

### Prototype
```typescript
class Shape {
  clone(): this { return Object.assign(Object.create(this), this); }
}
const circle = new Circle(10, "red");
const clone = circle.clone();
```

---

## 2. Estruturais (Composição de Classes/Objetos)

### Adapter
```typescript
class PayPalAdapter implements PaymentProcessor {
  constructor(private paypal: PayPalSDK) {}
  async process(amount: number): Promise<void> {
    await this.paypal.sendPayment(amount, "USD");
  }
}
// StripeAdapter, PagSeguroAdapter... mesma interface!
```

### Decorator
```typescript
interface DataSource { read(): string; write(data: string): void; }
class FileDataSource implements DataSource { ... }

class EncryptionDecorator implements DataSource {
  constructor(private source: DataSource) {}
  read(): string { return decrypt(this.source.read()); }
  write(data: string): void { this.source.write(encrypt(data)); }
}

class CompressionDecorator implements DataSource { ... }

// Uso
const source = new CompressionDecorator(
  new EncryptionDecorator(
    new FileDataSource("data.dat")
  )
);
```

### Facade
```typescript
class VideoConverter {
  convert(filename: string, format: string): File {
    const file = new VideoFile(filename);
    const codec = CodecFactory.extract(file);
    const buffer = BitrateReader.read(filename, codec);
    const result = BitrateReader.convert(buffer, codec);
    return new File(result);
  }
}
```

### Observer
```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();
  on(event: string, fn: Function): void { ... }
  emit(event: string, data: unknown): void { ... }
}
// Uso: pub/sub, notificações, React state changes
```

### Strategy
```typescript
interface ShippingStrategy {
  calculate(order: Order): Money;
}
class FedEx implements ShippingStrategy { calculate(order) { ... } }
class Correios implements ShippingStrategy { calculate(order) { ... } }
class Pickup implements ShippingStrategy { calculate() { return Money.zero(); } }

class ShippingCalculator {
  constructor(private strategy: ShippingStrategy) {}
  calculate(order: Order): Money { return this.strategy.calculate(order); }
}
```

### Command
```typescript
interface Command { execute(): void; undo(): void; }

class AddItemCommand implements Command {
  constructor(private order: Order, private item: OrderItem) {}
  execute(): void { this.order.addItem(this.item); }
  undo(): void { this.order.removeItem(this.item); }
}
// Fila de commands → undo stack → replay, rollback
```

---

## 3. Quando Usar Cada Padrão

| Pattern | Use Quando |
|---------|-----------|
| **Factory** | Criação complexa, múltiplas variantes |
| **Builder** | Muitos parâmetros opcionais, construção passo a passo |
| **Singleton** | Uma instância global (DB, config, logger) |
| **Adapter** | Integrar bibliotecas com interfaces diferentes |
| **Decorator** | Adicionar comportamento sem modificar classe |
| **Facade** | Simplificar subsistema complexo |
| **Observer** | Notificar múltiplos interessados de mudanças |
| **Strategy** | Variações de algoritmo intercambiáveis |
| **Command** | Operações reversíveis, fila de tarefas |
