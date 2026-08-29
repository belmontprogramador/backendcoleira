# Testes de Contrato — Referência Detalhada

## 1. O Problema

```
[Orders Service] ──REST──→ [Payments Service]
```
Orders espera que Payments aceite `{ orderId, amount, currency }`. Payments muda `amount` para `totalAmount`. Orders quebra em produção. Nenhum teste detectou.

---

## 2. Pact (Consumer-Driven Contracts)

```
Consumer (Orders) → define expectativa → gera contrato → Provider (Payments) verifica
```

### Consumer Side (Orders Service)
```typescript
const provider = new Pact({ consumer: 'Orders', provider: 'Payments' });

describe('Payments API', () => {
  it('can process payment', async () => {
    await provider.addInteraction({
      state: 'an order exists',
      uponReceiving: 'a payment request',
      withRequest: {
        method: 'POST',
        path: '/api/v1/payments',
        headers: { 'Content-Type': 'application/json' },
        body: { orderId: '123', amount: 150.00, currency: 'BRL' },
      },
      willRespondWith: {
        status: 201,
        body: { paymentId: 'pay-456', status: 'processed' },
      },
    });

    const result = await paymentClient.process({ orderId: '123', amount: 150.00, currency: 'BRL' });
    expect(result.paymentId).toBe('pay-456');
  });
});
```

### Provider Side (Payments Service)
```typescript
// Pact verifica se o provider REAL atende o contrato do consumer
const verifier = new Verifier({
  provider: 'Payments',
  providerBaseUrl: 'http://localhost:3002',
  pactUrls: ['pacts/Orders-Payments.json'],
});
await verifier.verify();
```

---

## 3. Schema Validation (OpenAPI/JSON Schema)

```typescript
// Validar response contra schema OpenAPI
import { validate } from 'openapi-validator';

const schema = await loadOpenApiSpec('api-spec.yaml');

it('GET /orders/:id response matches schema', async () => {
  const res = await request(app).get('/api/v1/orders/abc-123');
  const validation = validate(res.body, schema, '/orders/{id}', 'get', 200);
  expect(validation.errors).toHaveLength(0);
});
```

---

## 4. Quando Usar Cada Um

| Situação | Ferramenta |
|----------|-----------|
| Meu serviço CONSOME outro | Pact (consumer side) |
| Meu serviço é CONSUMIDO | Pact (provider side) |
| API pública (terceiros) | OpenAPI schema validation |
| Eventos assíncronos (Kafka) | JSON Schema + schema registry |

---

## 5. CI/CD com Pact

```
PR no Orders → roda consumer tests → gera pact → publica no Pact Broker
PR no Payments → roda provider tests → verifica contratos no Pact Broker
Se provider quebra contrato → CI FALHA → não deploya
```

Isso impede que um serviço quebre o contrato de outro sem ninguém saber.
