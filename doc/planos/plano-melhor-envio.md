# Plano — Venda de Pingente: Checkout, Pagamento, Frete e Rastreio

> **Status:** EM ANDAMENTO (V.2 concluída — pagamento promovido a compartilhado).
> Integra **Mercado Pago** (pagamento) + **Melhor Envio** (frete/rastreio) num fluxo
> de **venda do pingente no front do cliente**, com auditoria no front admin.
> Referências: `skiils/melhor-envio/SKILL.md`, `skiils/doc-sistema`.

## 1. Objetivo

Permitir que o **cliente compre o pingente** (produto físico Elopet) direto no
frontend, com:

1. **Preço dinâmico** — vem do banco (editável sem mexer em código).
2. **Jornada completa da compra** visível no front do cliente (status do pedido +
   estágios de rastreio).
3. **Toda venda registrada** no banco para auditoria e acompanhamento no front admin.
4. **Rastreio da venda em 4 estágios** (pedido feito → pago → enviado → recebido),
   **desacoplado** da ativação do pingente (que permanece exatamente como está hoje).

## 2. Requisitos (novos — do Belmont)

| # | Requisito | Onde vive |
|---|---|---|
| 1 | Checkout de venda de pingente no front do **cliente** | frontclient |
| 1.1 | Preço do pingente **dinâmico** (do banco, editável sem código) | backend `Product` + admin |
| 1.2 | Cliente vê **toda a jornada** (estágios de rastreio + status do pedido) | frontclient |
| 2 | Toda venda registrada no banco para **auditoria** + acompanhamento no front **admin** | backend `Order` + `AuditLog` + frontadmin |
| 3 | Cada venda rastreada: **pedido feito → pago → enviado → recebido** | backend `Order.status` |
| 3.1 | **Status de venda NÃO atrelado à ativação do pingente** | regra de domínio (decoupling) |
| 3.2 | Rastreio da venda ≠ ativação do pingente (ativação **inalterada**) | sem mexer no fluxo NFC/ownership |

## 3. Estado atual

- **NÃO existe** domínio de venda/order/frete no backend (grep: só falsos positivos).
- **Mercado Pago já integrado** (assinaturas): `PaymentGatewayPort` (genérico, checkout
  transparente Pix/Boleto/Cartão), `MercadoPagoGateway`, `MercadoPagoWebhookValidator`
  (HMAC), factory real/mock por `MERCADO_PAGO_ACCESS_TOKEN`.
- **`Price` VO** (centavos) já transversal (`src/common/value-objects/price.vo.ts`).
- **Ativação do pingente** (`NfcTag`: ownership + `CREATED→…→ACTIVE`) está pronta e **não
  deve ser alterada** (Requisito 3.2).
- **Melhor Envio** ainda não integrado — só a skill (`skiils/melhor-envio/SKILL.md`).
- Fase 9 (`order:manage`/`inventory:manage`) **não implementada** — este plano a antecipa
  parcialmente (venda + frete), **sem** estoque (`Inventory`).

## 4. Decisões propostas

| Decisão | Valor |
|---|---|
| Entidade de venda | `Order` (venda) — desacoplada de `NfcTag`/assinatura. |
| Preço dinâmico | `Product` (catálogo mínimo: SKU `pingente`, `price` em centavos via `Price` VO). |
| Pagamento | Reusar `PaymentGatewayPort` + `MercadoPagoGateway` (promovidos a compartilhado, ver §6). |
| Ciclo da venda | `PENDING → PAID → SHIPPED → DELIVERED` (+ `CANCELLED`/`REFUNDED`). |
| Frete | **Produto + frete** (API de cálculo de frete ME; total = produto + frete cobrado via MP). |
| Disparo da etiqueta | **Manual pelo admin** no MVP: venda confirmada → admin vê a venda e imprime a etiqueta. |
| Vínculo venda ↔ NfcTag | **Nenhum** — `Order` não referencia `NfcTag` (Requisito 3.1). |
| Reuso do MP | **Sim** — promover `PaymentGatewayPort` a `common/ports/` (refactor). |
| Rastreio | Polling (`tracking`) + webhook `order.*` (HMAC). |
| OAuth ME | 1 app + 1 conta → 1 par access/refresh, criptografado (AES-256-GCM) em `ShippingCredential`. |
| Auditoria | `Order` persistida + `AuditLog` em cada transição (reuso `AUDIT_LOGGER_PORT`). |
| RBAC | Cliente vê/compra os próprios pedidos; admin (ADMIN+) vê/gerencia todas as vendas. |

## 5. Decisões confirmadas (Belmont — 2026-09-05)

1. **Frete**: usar a API de cálculo de frete; o cliente paga **produto + frete**.
2. **Venda não referencia `NfcTag`** — desacoplamento total (Requisito 3.1).
3. **Etiqueta manual** no MVP: venda confirmada → admin vê a venda e imprime a etiqueta.
4. **Reuso do MP**: sim — promover `PaymentGatewayPort` a porta compartilhada.

## 6. Arquitetura (DIP)

Domínio/aplicação só enxergam portas. Nada concreto de MP/Melhor Envio no domínio.

```
                            ┌────────────────────────────────────────────┐
  presentation (orders)     │ OrdersController (cliente) / AdminOrdersController / Webhooks │
                            └────────────────────────────────────────────┘
  application               CreateOrderUseCase · PayOrderWebhookUseCase · ShipOrderUseCase ·
                            TrackOrderUseCase · GetOrderUseCase · ListMyOrdersUseCase · ListAllOrdersUseCase
                            │ dependem de portas
                            ▼
  domain (orders)           Order (entidade, máquina de estados) · OrderStatus VO
                            OrderRepositoryPort · OrderPaymentGatewayPort · ShippingGatewayPort
                            │
                            ├─ OrderPaymentGatewayPort  ──►  PaymentGatewayPort (compartilhado)
                            │                                  └── MercadoPagoGateway / Mock
                            └─ ShippingGatewayPort  ──►  MelhorEnvioGateway
                                                           └── MelhorEnvioClient (HTTP)
                                                               ├── ShippingTokenStorePort (OAuth refresh)
                                                               └── ShippingWebhookValidatorPort (HMAC)
```

- **`PaymentGatewayPort` → `common/ports/payment-gateway.port.ts`** (promoção): já é
  genérico (`createPayment`/`getPayment`, Pix/Boleto/Cartão). `subscriptions` e `orders`
  passam a consumir a mesma porta. `MercadoPagoGateway`/`MercadoPagoWebhookValidator`
  movem para `src/infrastructure/payments/` (compartilhado). `PaymentMethod`/`PaymentStatus`
  VOs idem para `common/value-objects/`.
- **`ShippingGatewayPort` → `common/ports/shipping-gateway.port.ts`** (contrato):
  `calculateQuote`, `createShipment`, `payShipment`, `generateLabel`, `printLabel`, `track`.
- **`OrderPaymentGatewayPort`** = thin adapter sobre `PaymentGatewayPort` com `notification_url`
  apontando para `/orders/webhook` (separa o webhook de venda do de assinatura).

### 6.1 Dois módulos separados e desacoplados (pergunta do Belmont)

- **`orders/`** — módulo de **checkout/venda**: domínio (`Order`, `OrderStatus`,
  `OrderRepositoryPort`), use cases, controllers. **NÃO conhece Melhor Envio nem Mercado
  Pago** — injeta só portas (`SHIPPING_GATEWAY_PORT`, `PAYMENT_GATEWAY_PORT`).
- **`src/infrastructure/shipping/`** — módulo de **consumo da API Melhor Envio**:
  `MelhorEnvioClient` (HTTP), `MelhorEnvioGateway` (implementa `ShippingGatewayPort`, 401 →
  refresh+retry), `PrismaShippingTokenStore`, `MelhorEnvioWebhookValidator`, `ShippingModule`
  (`@Global()`, factory real/mock exportando `SHIPPING_GATEWAY_PORT`).

> O **seam é a porta**: trocar Melhor Envio real por mock (ou por outra transportadora) não
> toca `orders`. É o mesmo padrão do `WHATSAPP_SENDER_PORT` (porta em `common/ports`,
> implementação em `infrastructure/whatsapp`). Desacoplamento confirmado. ✅

## 7. Modelo de dados (Prisma)

```text
Product                       # catálogo mínimo (preço dinâmico)
--------
id            (cuid, PK)
sku           (unique)        # "pingente"
name          (string)        # "Pingente Elopet"
price         (int)           # centavos (Price VO) — editável no admin
description   (string?, nullable)
active        (bool, default true)
created_at / updated_at

Order                         # venda (desacoplada de NfcTag)
-----
id            (cuid, PK)
buyer_id      (FK User)
product_id    (FK Product)
unit_price    (int)           # snapshot do preço no momento da compra (centavos)
quantity      (int, default 1)
freight_price (int)           # frete cobrado (0 = grátis)
total_price   (int)           # unit_price*qty + freight
status        (enum OrderStatus)
payment_id    (string?, nullable)   # id do pagamento no MP
payment_method (enum PaymentMethod) # pix/boleto/card
ship_*        (snapshot remetente/destinatário: cep, rua, numero, cidade, uf, nome, telefone)
freight_service_id (int?, nullable) # serviço ME escolhido
paid_at / shipped_at / delivered_at / cancelled_at / refunded_at (datetime?, nullable)
created_at / updated_at

Shipment                      # 1:1 com Order — etiqueta Melhor Envio
--------
id            (cuid, PK)
order_id      (FK Order, unique)
me_order_id   (string, unique)  # id da etiqueta no ME
protocol      (string)
service_id    (int)
status        (enum ShipmentStatus)  # pending/released/generated/posted/delivered/...
tracking      (string?, nullable)
tracking_url  (string?, nullable)
label_url     (string?, nullable)
generated_at / posted_at / delivered_at / cancelled_at (datetime?, nullable)
created_at / updated_at

ShippingCredential            # linha única — OAuth Melhor Envio
-----------------
id            (cuid, PK)
access_token  (encrypted)     # AES-256-GCM
refresh_token (encrypted)
expires_at    (datetime)
updated_at
```

> **Não criar** `Inventory` (Fase 9) nem vínculo `Order → NfcTag` por enquanto (Requisito
> 3.1). O `NfcTag` e seu fluxo de ativação ficam **intocados**. Transições de `Order.status`
> geram `AuditLog` (reuso `AUDIT_LOGGER_PORT`).

## 8. Ciclo de vida da venda × ativação (decoupling — Requisito 3)

**Venda (`Order.status`)** — 4 estágios + terminais:

```text
PENDING ──► PAID ──► SHIPPED ──► DELIVERED
   │          │          │
   └──► CANCELLED        └──► REFUNDED (estorno)
```

| Estágio | Gatilho |
|---|---|
| `PENDING` (pedido feito) | `POST /orders` cria Order + pagamento MP. |
| `PAID` (pago) | webhook MP `payment.approved` → `getPayment` confirma. |
| `SHIPPED` (enviado) | admin gera etiqueta ME + confirma postagem (`ShipOrderUseCase`). |
| `DELIVERED` (recebido) | webhook ME `order.delivered` (ou admin marca). |

**Ativação do pingente** — **INALTERADA**: continua sendo o fluxo NFC/ownership existente
(scan → `activate-by-code`/`activate-tag` → associa pet → `AVAILABLE → ACTIVE`).

> **Regra:** nenhum use case de venda escreve em `NfcTag` (status/owner/pet). As duas
> máquinas de estado (`Order.status` e `NfcTag.status`) evoluem de forma independente.

## 9. Fluxos de negócio

### 9.1 Checkout (front do cliente)

```text
1. GET  /products/pingente                     → { id, name, price }   (preço dinâmico do banco)
2. POST /orders/quote  { cep, products }       → ofertas de frete ME (custom_price/delivery_time)
3. POST /orders  { productId, qty, ship*, freightServiceId, paymentMethod, cardToken? }
   → Order(PENDING) + pagamento MP → retorna { orderId, pix/boleto/card }
4. cliente paga → webhook MP → Order → PAID
```

### 9.2 Despacho (admin)

```text
admin vê Order PAID → ShipOrderUseCase:
  1. MelhorEnvio cart → checkout → generate → print  (saldo carteira ME)
  2. Shipment criado + Order → SHIPPED (postagem)
```

### 9.3 Rastreio (cliente)

```text
GET /orders/me/:id → { status, timeline[], tracking{ code, url, history[] }, product, totals }
```
- `timeline` = os 4 estágios com datas (`created_at`/`paid_at`/`shipped_at`/`delivered_at`).
- `tracking` = última posição ME (polling) + webhook `order.*` atualiza `Shipment`.

## 10. Endpoints (novos)

| Método/Rota | Acesso | Descrição |
|---|---|---|
| `GET /products/pingente` | público | Preço dinâmico + dados do produto. |
| `PATCH /admin/products/:id` | ADMIN+ | Edita preço/nome/ativo (sem mexer em código). |
| `POST /orders/quote` | público | Cotação de frete (Melhor Envio calculate). |
| `POST /orders` | USER | Cria pedido (PENDING) + pagamento MP. |
| `GET /orders/me` | USER | Lista pedidos do cliente (jornada). |
| `GET /orders/me/:id` | USER | Detalhe: status + timeline + rastreio. |
| `GET /admin/orders` | ADMIN+ | Todas as vendas (filtro status, paginação). |
| `GET /admin/orders/:id` | ADMIN+ | Detalhe de uma venda (auditoria). |
| `POST /admin/orders/:id/ship` | ADMIN+ | Gera etiqueta ME + marca SHIPPED. |
| `PATCH /admin/orders/:id/status` | ADMIN+ | Ajuste manual (ex.: marcar DELIVERED). |
| `POST /orders/webhook` | público (HMAC) | Webhook MP do pedido (payment.approved). |
| `POST /webhooks/melhor-envio` | público (HMAC) | Webhook ME `order.*`. |
| `GET /admin/shipping/oauth/authorize` | SUPER_ADMIN | Inicia OAuth ME. |
| `GET /api/shipping/oauth/callback` | público | Recebe `code` → token → persiste. |

### 10.1 Regras de acesso e ownership das orders (decisão Belmont — 05/09)

- **Compra exige login**: `POST /orders` é `USER` — a guard global `JwtAuthGuard` exige token
  (não é `@Public()`). Cliente deslogado não compra (o front o redireciona ao login).
- **`buyer_id` vem do token, nunca do body**: o payload de `POST /orders` **não** aceita
  `buyerId`/`userId`. O use case resolve o comprador via `@CurrentUser() user.id` e grava
  `Order.buyer_id = user.id` — **toda compra nasce associada ao usuário logado**.
- **`GET /orders/me`**: lista **sempre** filtrada por `buyer_id = user.id` (um cliente só
  enxerga as próprias compras). Paginação padrão (`page`/`limit`).
- **`GET /orders/me/:id`**: ownership check — se a order não existir **ou** pertencer a outro
  usuário → `404` (não vaza a existência). Padrão idêntico ao `tag-ownership.policy` /
  `pet-ownership.policy` já existentes.
- **Área logada do frontclient**: `GET /orders/me` alimenta a página "Meus pedidos" do
  dashboard logado (timeline `PENDING→PAID→SHIPPED→DELIVERED` + rastreio).

## 11. Configuração (env)

Adicionar ao `envSchema` + `.env.example`:

| Var | Exemplo | Uso |
|---|---|---|
| `MELHOR_ENVIO_CLIENT_ID` | `abc123` | OAuth client id |
| `MELHOR_ENVIO_CLIENT_SECRET` | `segredo` | OAuth client secret |
| `MELHOR_ENVIO_REDIRECT_URI` | `https://elopet.online/api/shipping/oauth/callback` | callback |
| `MELHOR_ENVIO_BASE_URL` | `https://melhorenvio.com.br` | (sandbox: `https://sandbox.melhorenvio.com.br`) |
| `MELHOR_ENVIO_WEBHOOK_SECRET` | `segredo-webhook` | HMAC-SHA256 do webhook ME |
| `MELHOR_ENVIO_FROM_POSTAL_CODE` | `01310100` | CEP remetente (Elopet) |

> `MERCADO_PAGO_*` já existem (reuso). Sem env → `MockShippingGateway`/`MockPaymentGateway`.

## 12. Sub-fases (TDD)

- **V.1** — Skill + este plano. ✅
- **V.2** — Promoção do pagamento a compartilhado: `PaymentGatewayPort` + VOs +
  `MercadoPagoGateway`/`Validator` → `common/`/`infrastructure/payments/` (refactor, specs verdes). ✅
- **V.3** — `Product`: entidade + repo + `PATCH /admin/products/:id` + `GET /products/pingente` + specs + e2e. ✅
- **V.4** — `Order` (domínio): entidade + máquina de estados (PENDING→PAID→SHIPPED→DELIVERED) + specs. ✅
- **V.5** — `MelhorEnvioClient` + `ShippingTokenStorePort`/`PrismaShippingTokenStore` + `WebhookValidator` + specs. ✅
- **V.6** — `MelhorEnvioGateway` + `MockShippingGateway` + factory + specs (401→refresh). ✅
- **V.7** — Use cases: `CreateOrder` (quote+pagamento), `PayOrderWebhook`, `ShipOrder`, `TrackOrder`, `GetOrder`, `ListMyOrders`, `ListAllOrders` + specs. ✅ (inclui `OrderRepositoryPort` + `Shipment` domain entity + `ShipmentRepositoryPort` — a persistência Prisma fica na V.8)
- **V.8** — Prisma `Product`/`Order`/`Shipment`/`ShippingCredential` + repositories/mappers + specs. ✅
- **V.9** — Presentation: controllers (cliente/admin/webhooks) + specs. ✅
- **V.10** — E2E (mocks MP/ME), Postman, docs, `MEMORY.md`.

## 13. Testes (TDD obrigatório)

- **Unit** — máquina de estados `Order` (transições válidas/inválidas), `Product` price,
  `MelhorEnvioClient` (HTTP mock), `MelhorEnvioGateway` (401/refresh), webhook validators (HMAC).
- **Integração** — gateway contra servidor HTTP mock (não a API real).
- **E2E** — mocks MP/ME; `--runInBand`; sem colidir com Postgres/Redis de DEV.

## 14. Definição de Pronto (DoD)

- Preço do pingente editável no admin sem deploy (vem do banco).
- Cliente compra, paga (Pix/Boleto/Cartão) e vê a jornada completa (4 estágios + rastreio).
- Toda venda persistida (`Order`) + `AuditLog` por transição; admin lista/detalha/avança status.
- Venda **nunca** altera `NfcTag` (ativação intacta).
- DIP + TDD respeitados; `nest build` EXIT 0; testes `--runInBand` verdes.
- Webhooks MP e ME validados por HMAC antes de qualquer efeito.

## 15. Fora de escopo (futuro)

- `Inventory`/estoque (Fase 9) — o despacho físico pega o tag do estoque quando existir.
- Vínculo `Order → NfcTag` (opcional, pós-aprovação do §5.2).
- Envio automático no pagamento (pós-saldo configurado na carteira ME).
- Múltiplas contas Melhor Envio (lojistas) e múltiplos produtos/carrinho.
- DCe/NFe avançado (comunicação SEFAZ).
