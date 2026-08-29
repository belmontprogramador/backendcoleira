# Testes E2E e Carga — Referência Detalhada

## 1. Playwright (Recomendado para E2E moderno)

```typescript
test('user can create and submit an order', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'customer@test.com');
  await page.fill('[name="password"]', 'test123');
  await page.click('button[type="submit"]');

  // Criar pedido
  await page.goto('/orders/new');
  await page.click('[data-testid="add-product"]');
  await page.fill('[name="quantity"]', '2');
  await page.click('[data-testid="submit-order"]');

  // Verificar
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('submitted');
});
```

### Playwright vs Cypress
| | Playwright | Cypress |
|---|-----------|---------|
| Browsers | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge |
| Linguagem | TypeScript/JS nativo | TypeScript/JS |
| Paralelismo | Nativo (workers) | Pago (Dashboard) |
| Mobile | Emulação real | Viewport apenas |
| API testing | Nativo (`request`) | Via `cy.request()` |

---

## 2. Cypress (Alternativa)

```typescript
describe('Order Flow', () => {
  it('completes order lifecycle', () => {
    cy.visit('/orders/new');
    cy.get('[data-testid="add-product"]').click();
    cy.get('[name="quantity"]').type('2');
    cy.get('[data-testid="submit-order"]').click();
    cy.get('[data-testid="order-status"]').should('contain', 'submitted');
  });
});
```

---

## 3. k6 — Teste de Carga

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // sobe para 50 users
    { duration: '1m', target: 50 },   // mantem 50 users por 1 min
    { duration: '30s', target: 0 },   // desce para 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das reqs < 500ms
    http_req_failed: ['rate<0.01'],   // erro < 1%
  },
};

export default function () {
  const res = http.get('http://api:3001/api/v1/orders');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Métricas k6
- `http_req_duration`: latência (avg, p95, p99)
- `http_req_failed`: taxa de erro
- `http_reqs`: throughput (req/s)
- `vus`: usuários virtuais ativos

---

## 4. Smoke Tests (Pós-Deploy)

```bash
#!/bin/bash
# smoke.sh — roda após deploy
HEALTH=$(curl -s http://api:3001/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ API healthy"
else
  echo "❌ API down!" && exit 1
fi

ORDER=$(curl -s -X POST http://api:3001/api/v1/orders -H "Content-Type: application/json" -d '{"customerId":"smoke-test","items":[{"productId":"p1","productName":"Smoke","quantity":1,"unitPrice":1}]}')
if echo "$ORDER" | grep -q "draft"; then
  echo "✅ Order created"
else
  echo "❌ Order creation failed!" && exit 1
fi
```

---

## 5. Estratégia de E2E

- **Caminho feliz:** fluxo principal (criar pedido, pagar, receber)
- **Caminho triste:** erro de validação, timeout, 404
- **Crítico:** o que não pode falhar (checkout, pagamento)
- **NÃO testar:** variações de dados (1 item vs 10 itens = teste unitário)
