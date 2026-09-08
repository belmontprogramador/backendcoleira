# 📋 PLANO DE IMPLEMENTAÇÃO — ÁREA DE AFILIADOS DE VENDAS

> **Status:** APROVADO (decisões fechadas em 2026-09-08). Aguardando o pontapé
> para começar a execução (A.2 → A.11).
> Domínio novo. Serve tanto para **venda de pingente** (`Order`) quanto para
> **assinaturas** (`Subscription`), com comissão configurável (fixa / percentual /
> fixa+percentual), saques com fluxo de status e área própria do afiliado.
> Referências: `plano-melhor-envio.md` (vendas), `plano-planos-assinaturas.md`
> (assinaturas), `skiils/doc-sistema` (RBAC/regras).

---

## 1. Objetivo

Criar um **programa de afiliados** onde:

1. O **admin** cadastra/edita afiliados, define a **comissão de cada um** (fixa,
   percentual, ou fixa+percentual — dinâmica), ativa/desativa, vê **KPIs** e gerencia
   as **solicitações de saque** (`recebido → processando → pago`).
2. O **afiliado** tem uma área própria: edita seus dados, vê **KPIs das suas vendas**,
   acompanha o **status dos saques**, solicita **saque** e acessa o seu **link de indicação**.
3. Toda venda de pingente **paga** e todo **ciclo pago** de assinatura atribuídos a um
   link de afiliado geram uma **comissão** (cálculo automático, auditado).

---

## 2. Requisitos (do Belmont)

| # | Requisito | Onde vive |
|---|---|---|
| 1 | Área de afiliados de vendas | backend + fronts |
| 2 | Serve para assinaturas **e** venda de pingente | atribuição dupla |
| 3 | Admin define comissão: **fixo / percentual / fixo+percentual**, taxas **dinâmicas** | `Affiliate` + CRUD admin |
| 4 | Admin seta status de saque: **recebido, processando, pago** | `Withdrawal.status` |
| 5 | Admin: CRUD completo do afiliado + **ativar/desativar** | `Affiliate` + use cases |
| 6 | Admin: métricas/KPIs de cada afiliado | `AffiliateMetrics` |
| 7 | Afiliado tem área própria | front cliente |
| 8 | Afiliado edita suas informações | use case self |
| 9 | Afiliado vê KPIs das vendas + status dos saques | use case self |
| 10 | Afiliado solicita saque | `Withdrawal` |
| 11 | Painel do afiliado mostra o **link de afiliado** | `Affiliate.code` |
| 12 | Plano de execução para aprovação | este doc |

---

## 3. Estado atual

- **NÃO existe** nada de afiliado/comissão/referral (grep confirmou).
- **Vendas** (`orders`) já prontas: `Order` tem ciclo `PENDING→PAID→SHIPPED→DELIVERED`,
  com `payment_id`, `unit_price`, `freight_price`, `buyer_id`. Pagamento confirmado via
  webhook MP `payment.approved` → `order.markPaid()`.
- **Assinaturas** (`subscriptions`) prontas: no `ProcessPaymentWebhookUseCase`, o pagamento
  aprovado (com `transaction.planId`) **cria** a `Subscription` (1ª ativação) ou **renova**
  (`existing.renew(period)`). O ponto de gancho recorrente é o bloco `if (transaction.planId)`
  do `handleApproved`, executado em **todo** ciclo aprovado.
- **RBAC**: `USER < SUPPORT < OPERATOR < ADMIN < SUPER_ADMIN` + permissões (`Permission`/`RolePermission`).
- **Padrões obrigatórios**: DDD 4 camadas, DIP, TDD (spec co-localizado), Zod, Prisma 7
  PascalCase, ids `cuid()`, auditoria via `AUDIT_LOGGER_PORT`.

---

## 4. Decisões de design (APROVADAS)

### 4.1 Modelo de afiliado

- **`Affiliate` é entidade de domínio própria**, com vínculo opcional 1:1 a `User`
  (`Affiliate.user_id` unique nullable). O afiliado **logga com email/senha** (reusa o
  JWT/roles existente), não duplica autenticação. ✅ (decisão #1)
- **Fluxo MVP (admin cria)**: ao criar um afiliado, o sistema **cria/associa um `User`**
  (role `USER`, status `ACTIVE`, senha temporária enviada por email via
  `EMAIL_SENDER_PORT`). O afiliado loga e acessa a área.
- A área do afiliado é um **subconjunto do front cliente** (rota `/dashboard/afiliado`),
  resolvido pela presença de um `Affiliate` ativo ligado ao `user.id`.
- **Auto-cadastro** (usuário vira afiliado sozinho) fica **fora do escopo** (futuro).

### 4.2 Comissão (dinâmica, snapshot)

- Config vive **por afiliado** no próprio `Affiliate`:
  - `commission_type` ∈ `FIXED | PERCENTAGE | FIXED_PLUS_PERCENTAGE`.
  - `commission_fixed_cents` (Int, centavos) — usado em FIXED e FIXED_PLUS_PERCENTAGE.
  - `commission_percent_bps` (Int, **basis points**) — usado em PERCENTAGE e FIXED_PLUS_PERCENTAGE.
- **Percentual em bps** (1% = 100 bps) para evitar float/arredondamento. Na UI o admin digita
  decimal (ex.: `10.5`%), o backend converte para `1050` bps.
- **Snapshot na atribuição**: o cálculo usa a config **no momento da venda/ciclo**. Mudar a
  comissão depois **não** afeta comissões já geradas (auditável, previsível).
- **Base do percentual** (decisão #2 — **sem frete**):
  - Pingente: `unit_price * quantity`.
  - Assinatura: `Plan.price_cents`.
- **Cálculo**:
  - `FIXED` → `amount = fixed_cents`.
  - `PERCENTAGE` → `amount = round(base * percent_bps / 10000)`.
  - `FIXED_PLUS_PERCENTAGE` → `amount = fixed_cents + round(base * percent_bps / 10000)`.

### 4.3 Link de afiliado (referral)

- `Affiliate.code` — slug único **definido pelo admin** (decisão #6). Validação: `[a-z0-9-]{3,32}`,
  único, case-insensitive. Não há geração automática.
- Link canônico: `https://elopet.online/?ref=<code>`.
- **Atribuição first-click** (decisão #7): o front grava cookie `elopet_ref=<code>`
  (TTL 30 dias) ao detectar `?ref=`. O primeiro clique vence (não sobrescreve).
- Nos checkouts (**pingente** e **assinatura**), o front lê o cookie e envia `referralCode`
  no body → persistido em `Order.referral_code` / `Subscription.referral_code`.

### 4.4 Atribuição da comissão (gancho desacoplado)

- Porta transversal `AFFILIATE_COMMISSION_PORT` (`common/ports`), consumida por `orders` e
  `subscriptions` (padrão do `UserAccessPort`/`AUDIT_LOGGER_PORT`):
  - `attributeOrder(orderId): Promise<void>` — chamado quando `Order → PAID`.
  - `attributeSubscription(subscriptionId): Promise<void>` — chamado em **cada ciclo pago**
    da assinatura (1ª ativação **e** renovações). ✅ (decisão #3 — recorrente)
  - `revokeOrder(orderId)` / `revokeSubscription(subscriptionId)` — estorno (refund/cancel).
- Implementação `AffiliateCommissionService` (módulo `affiliates`): resolve afiliado ativo pelo
  `referral_code` snapshotado, calcula e persiste `Commission`, audita.
- **Elegibilidade**:
  - Pingente: comissão gerada no `PAID`; **cancelada** se `REFUNDED/CANCELLED` antes do saque.
  - Assinatura: **uma comissão por ciclo pago** — cada pagamento aprovado (ativo ou renovação)
    gera uma `Commission` com base no `Plan.price_cents` do ciclo. Se um ciclo for reembolsado
    antes do saque, a comissão daquele ciclo é cancelada.

### 4.5 Saldo e saque

- **Saldo derivado** (sem estado duplicado):
  `available = Σ Commission(AVAILABLE) − Σ Withdrawal(RECEIVED|PROCESSING|PAID)`.
- `Withdrawal.status` ∈ `RECEIVED | PROCESSING | PAID | REJECTED` (os 3 pedidos + `REJECTED`
  para o admin recusar um saque inválido). ✅ (decisão #4)
- **Piso de saque por afiliado** (decisão #5): `Affiliate.min_withdrawal_cents`
  (`Int @default(0)`). `RequestWithdrawalUseCase` valida:
  `amount >= min_withdrawal_cents` **e** `amount <= available`.
- Snapshot da chave Pix no saque (`Withdrawal.pix_key`), para auditoria mesmo se o afiliado
  trocar depois.

### 4.6 KPIs / métricas

Objeto agregado `AffiliateMetrics` (use cases `GetAffiliateMetricsUseCase` admin +
`GetMyMetricsUseCase` self):
- `salesCount` (vendas de pingente atribuídas), `subscriptionsCount` (ciclos de assinatura comissionados).
- `revenueCents` (soma das bases), `commissionTotalCents` (soma das comissões).
- `availableCents` (saldo disponível), `withdrawnCents` (total sacado pago).
- (Sem contagem de cliques no MVP — fora de escopo.)

### 4.7 RBAC / permissões

| Permissão | Acesso | Uso |
|---|---|---|
| `affiliate:manage` | ADMIN, SUPER_ADMIN | CRUD afiliados + config comissão + status de saque |
| `affiliate:read` | ADMIN, SUPER_ADMIN | listar/detalhar/métricas (admin) |

- Rotas self do afiliado (`/affiliate/me`) exigem **JWT** (role `USER`) + **vínculo `Affiliate`
  ativo** validado no use case (não dependem de permissão RBAC nova).
- Hierarquia `canManage` aplicada nos use cases admin (só gerencia roles inferiores, padrão existente).

---

## 5. Modelo de dados (Prisma)

```prisma
enum AffiliateStatus { ACTIVE INACTIVE }
enum CommissionType { FIXED PERCENTAGE FIXED_PLUS_PERCENTAGE }
enum CommissionStatus { AVAILABLE CANCELLED }
enum CommissionSource { ORDER SUBSCRIPTION }
enum WithdrawalStatus { RECEIVED PROCESSING PAID REJECTED }

model Affiliate {
  id                     String          @id @default(cuid())
  user_id                String?         @unique   // 1:1 opcional com User
  code                   String          @unique   // referral code (definido pelo admin)
  name                   String
  email                  String          @unique
  phone                  String?
  document               String?                   // CPF/CNPJ
  pix_key                String?                   // chave Pix p/ receber comissão
  bank_name              String?
  bank_agency            String?
  bank_account           String?
  commission_type        CommissionType  @default(PERCENTAGE)
  commission_fixed_cents Int             @default(0)
  commission_percent_bps Int             @default(0)
  min_withdrawal_cents   Int             @default(0) // piso de saque do afiliado
  status                 AffiliateStatus @default(ACTIVE)
  created_at             DateTime        @default(now())
  updated_at             DateTime        @updatedAt

  user        User?        @relation(fields: [user_id], references: [id], onDelete: SetNull)
  commissions Commission[]
  withdrawals Withdrawal[]

  @@index([status])
  @@index([created_at])
  @@map("affiliates")
}

model Commission {
  id                String           @id @default(cuid())
  affiliate_id      String
  source            CommissionSource
  order_id          String?
  subscription_id   String?
  base_amount_cents Int
  commission_type   CommissionType
  fixed_cents       Int
  percent_bps       Int
  amount_cents      Int
  status            CommissionStatus @default(AVAILABLE)
  created_at        DateTime         @default(now())
  updated_at        DateTime         @updatedAt

  affiliate    Affiliate     @relation(fields: [affiliate_id], references: [id], onDelete: Cascade)
  order        Order?        @relation(fields: [order_id], references: [id], onDelete: SetNull)
  subscription Subscription? @relation(fields: [subscription_id], references: [id], onDelete: SetNull)

  @@index([affiliate_id, status])
  @@index([order_id])
  @@index([subscription_id])
  @@map("commissions")
}

model Withdrawal {
  id           String           @id @default(cuid())
  affiliate_id String
  amount_cents Int
  pix_key      String
  status       WithdrawalStatus @default(RECEIVED)
  requested_at DateTime         @default(now())
  processed_at DateTime?
  paid_at      DateTime?
  created_at   DateTime         @default(now())
  updated_at   DateTime         @updatedAt

  affiliate Affiliate @relation(fields: [affiliate_id], references: [id], onDelete: Cascade)

  @@index([affiliate_id, status])
  @@index([status])
  @@map("withdrawals")
}
```

**Alterações nas models existentes:**

```prisma
model User {
  // ...campos atuais...
  affiliate Affiliate?   // ADD (1:1 opcional)
}

model Order {
  // ...campos atuais...
  referral_code String?   // ADD — code usado no checkout (snapshot)
  commissions   Commission[]
}

model Subscription {
  // ...campos atuais...
  referral_code String?   // ADD — code usado no checkout (snapshot)
  commissions   Commission[]
}
```

> **Regra cross-phase**: `Affiliate` referencia `User`; `Commission` referencia `Order` e
> `Subscription`. Como as três já existem, **não** há relação comentada — tudo pode nascer
> na mesma migration desta fase.

---

## 6. Domínio (DDD)

### Entidades
- `Affiliate` — identidade `cuid`, `code` único, config de comissão, `minWithdrawalCents`, `status`.
  - Métodos: `activate()`, `deactivate()`, `changeCommission(cfg)`, `changeMinWithdrawal(cents)`.
  - Invariantes: `email`/`code` únicos; bps `>= 0`; fixed `>= 0`; minWithdrawal `>= 0`.
- `Commission` — `source`, base, config snapshot, `amountCents`, `status`.
  - Métodos: `cancel()` (estorno). Nasce `AVAILABLE`.
- `Withdrawal` — `amountCents`, `pixKey` snapshot, `status`.
  - Métodos: `markProcessing()`, `markPaid()`, `markRejected()`.

### Value Objects
- `CommissionConfig` — `{ type, fixedCents, percentBps }` + método `calculate(baseCents): number`
  (imutável, centraliza o cálculo fixo/percentual/fixo+percentual — testado à exaustão).
- `CommissionStatus`, `CommissionType`, `CommissionSource`, `WithdrawalStatus`, `AffiliateStatus`
  — enums tipados.

---

## 7. Portas (DIP)

| Porta | Local | Contrato |
|---|---|---|
| `AffiliateRepositoryPort` | `affiliates/domain` | `save`, `findById`, `findByUserId`, `findByCode`, `findByEmail`, `list(filter)`, `count(filter)` |
| `CommissionRepositoryPort` | `affiliates/domain` | `save`, `findByAffiliateId`, `sumAvailableByAffiliateId`, `findByOrderId`, `findBySubscriptionId`, `cancelByOrderId`, `cancelBySubscriptionId` |
| `WithdrawalRepositoryPort` | `affiliates/domain` | `save`, `findById`, `listByAffiliateId`, `sumActiveByAffiliateId`, `list(filter)` |
| `AFFILIATE_COMMISSION_PORT` | `common/ports` (transversal) | `attributeOrder(orderId)`, `attributeSubscription(subscriptionId)`, `revokeOrder(orderId)`, `revokeSubscription(subscriptionId)` |
| `AFFILIATE_METRICS_PORT` | `affiliates/domain` (ou `common`) | `getMetrics(affiliateId): AffiliateMetrics` |

> `orders` e `subscriptions` injetam **somente** `AFFILIATE_COMMISSION_PORT` (nunca o
> repositório concreto) — desacoplamento total, mesmo padrão do webhook de pagamento.

---

## 8. Use cases

### Admin (afiliados)
1. `CreateAffiliateUseCase` — cria afiliado (**`code` definido pelo admin, obrigatório** +
   cria/linka `User` com senha temporária + email). Perm `affiliate:manage`.
2. `UpdateAffiliateUseCase` — edita todos os dados (nome, contato, pix/bancários, comissão,
   `minWithdrawalCents`). `affiliate:manage`.
3. `SetAffiliateStatusUseCase` — ativar/desativar. `affiliate:manage`.
4. `ListAffiliatesUseCase` — lista paginada (filtro status/email/code). `affiliate:read`.
5. `GetAffiliateUseCase` — detalhe. `affiliate:read`.
6. `GetAffiliateMetricsUseCase` — KPIs de um afiliado. `affiliate:read`.

### Admin (saques)
7. `ListWithdrawalsUseCase` — lista paginada (filtro status/afiliado). `affiliate:read`.
8. `UpdateWithdrawalStatusUseCase` — `RECEIVED → PROCESSING → PAID` (+ `REJECTED`). `affiliate:manage`.

### Afiliado (self)
9. `GetMyAffiliateUseCase` — perfil + link + KPIs (dono). JWT + vínculo ativo.
10. `UpdateMyAffiliateUseCase` — edita próprios dados (não comissão/status/piso). JWT + vínculo ativo.
11. `GetMyMetricsUseCase` — KPIs próprios. JWT + vínculo ativo.
12. `RequestWithdrawalUseCase` — solicita saque (`amount >= min` **e** `amount <= available`). JWT + vínculo ativo.
13. `ListMyWithdrawalsUseCase` — próprios saques + status. JWT + vínculo ativo.

### Atribuição (interno)
14. `AttributeOrderCommissionUseCase` — implementa `attributeOrder` (resolve code → calcula →
    persiste `Commission` → audita).
15. `AttributeSubscriptionCommissionUseCase` — implementa `attributeSubscription` (idem, por ciclo).
16. `RevokeOrderCommissionUseCase` / `RevokeSubscriptionCommissionUseCase` — estorno.

---

## 9. Endpoints (novos)

| Método | Rota | Acesso | Use case |
|---|---|---|---|
| POST | `/admin/affiliates` | `affiliate:manage` | Create |
| GET | `/admin/affiliates` | `affiliate:read` | List |
| GET | `/admin/affiliates/:id` | `affiliate:read` | Get |
| PATCH | `/admin/affiliates/:id` | `affiliate:manage` | Update |
| PATCH | `/admin/affiliates/:id/status` | `affiliate:manage` | SetStatus |
| GET | `/admin/affiliates/:id/metrics` | `affiliate:read` | Metrics |
| GET | `/admin/withdrawals` | `affiliate:read` | ListWithdrawals |
| PATCH | `/admin/withdrawals/:id/status` | `affiliate:manage` | UpdateStatus |
| GET | `/affiliate/me` | JWT (USER + vínculo) | GetMy |
| PATCH | `/affiliate/me` | JWT (USER + vínculo) | UpdateMy |
| GET | `/affiliate/me/metrics` | JWT (USER + vínculo) | MyMetrics |
| POST | `/affiliate/me/withdrawals` | JWT (USER + vínculo) | RequestWithdrawal |
| GET | `/affiliate/me/withdrawals` | JWT (USER + vínculo) | ListMyWithdrawals |

**Alterações em endpoints existentes** (aceitar `referralCode` opcional no body):
- `POST /orders` (checkout pingente) → grava `Order.referral_code`.
- `POST /subscriptions/checkout` → grava `Subscription.referral_code`.

> Validação **Zod** em todos os DTOs. Rotas self do afiliado usam `@CurrentUser() user.id`
> (nunca aceitam `affiliateId` no body — anti-IDOR).

---

## 10. Fluxos de negócio

### 10.1 Admin cria afiliado
```
POST /admin/affiliates { code, name, email, pixKey, commission{type, fixed, percent},
                         minWithdrawalCents, ... }
  → valida code único (definido pelo admin)
  → cria User (senha temporária + email) → cria Affiliate(ACTIVE) → audita
```

### 10.2 Cliente compra via link (pingente)
```
1. cliente abre https://elopet.online/?ref=ana123 → cookie elopet_ref=ana123 (30d)
2. POST /orders { ..., referralCode: "ana123" } → Order.referral_code = "ana123"
3. webhook MP approve → order.markPaid()
   → AFFILIATE_COMMISSION_PORT.attributeOrder(orderId) → Commission(AVAILABLE, amount calculado)
```

### 10.3 Cliente assina via link (comissão recorrente)
```
1. cookie elopet_ref=ana123
2. POST /subscriptions/checkout { ..., referralCode: "ana123" } → Subscription.referral_code
3. webhook MP approve (1ª ativação OU renovação) → Subscription criada/renew
   → AFFILIATE_COMMISSION_PORT.attributeSubscription(subscriptionId) → Commission por ciclo
   (a cada pagamento aprovado, enquanto o cliente seguir pagando)
```

### 10.4 Afiliado saca
```
GET /affiliate/me/metrics → { availableCents, minWithdrawalCents }
POST /affiliate/me/withdrawals { amountCents }
   → valida amount >= minWithdrawalCents E amount <= availableCents → Withdrawal(RECEIVED)
admin: PATCH /admin/withdrawals/:id/status → PROCESSING → PAID (audita cada transição)
```

---

## 11. Configuração (env)

| Var | Exemplo | Uso |
|---|---|---|
| `AFFILIATE_LINK_BASE_URL` | `https://elopet.online` | monta o link `?ref=<code>` |
| `AFFILIATE_COOKIE_TTL_DAYS` | `30` | TTL do cookie first-click (front) |

---

## 12. Frontends

### Front admin (`/dashboard/afiliados`)
- Lista paginada de afiliados (status, email, code, comissão, piso de saque, saldo) + busca/filtro.
- Sheet/dialog de **criar/editar** (todos os campos + `code` definido pelo admin + config de
  comissão fixo/percentual/fixo+percentual + piso de saque).
- Botão **ativar/desativar**.
- **KPIs** por afiliado (vendas, receita, comissão, saldo, sacado).
- Aba/sessão **Saques**: lista de solicitações + avanço de status (`recebido → processando → pago`,
  ou `recusado`).

### Front cliente (`/dashboard/afiliado`)
- **Link de afiliado** visível + botão copiar (`https://elopet.online/?ref=<code>`).
- Edição dos próprios dados (nome, pix, bancários) — **sem** comissão/status/piso.
- **KPIs** próprios + lista de **saques** com status.
- **Solicitar saque** (valor >= piso **e** <= saldo).
- Captura de `?ref=` na home → cookie (first-click) + envio de `referralCode` no checkout
  (pingente e assinatura).

---

## 13. Sub-fases (TDD — ordem de execução)

| Fase | Entrega |
|---|---|
| **A.1** | Plano + decisões fechadas (este doc). ✅ |
| **A.2** | Schema Prisma (`Affiliate`, `Commission`, `Withdrawal`, enums + `referral_code` em `Order`/`Subscription` + relações) + migration + `prisma generate`. |
| **A.3** | Domínio: `Affiliate`/`Commission`/`Withdrawal` + `CommissionConfig` (cálculo) + VOs + specs (TDD red→green). |
| **A.4** | Portas + repositórios Prisma + mappers + specs. |
| **A.5** | Use cases admin de afiliado (CRUD, status, listar, métricas) + specs. |
| **A.6** | Use cases de saque (solicitar self, listar, atualizar status admin) + specs. |
| **A.7** | `AFFILIATE_COMMISSION_PORT` + `AffiliateCommissionService` + hooks em `orders` (PAID) e `subscriptions` (cada ciclo aprovado) + estorno + specs. |
| **A.8** | Controllers (`admin-affiliates`, `admin-withdrawals`, `affiliate` self) + specs. |
| **A.9** | Front admin (afiliados + saques + KPIs) + build/eslint. |
| **A.10** | Front cliente (área do afiliado + captura `?ref=` + envio no checkout) + build/eslint. |
| **A.11** | E2E (fluxo: criar afiliado → comprar via ref → comissão → renovação gera nova comissão → saque → pagamento), Postman, docs, `MEMORY.md`. |

---

## 14. Testes (TDD obrigatório)

- **Unit** — `CommissionConfig.calculate` (fixo/percentual/fixo+percentual, bps, round),
  máquina de estados de `Withdrawal` (RECEIVED→PROCESSING→PAID/REJECTED, transições inválidas),
  `Affiliate` (activate/deactivate/changeCommission/changeMinWithdrawal),
  `RequestWithdrawal` (não saca < piso **nem** > saldo).
- **Integração** — repositórios Prisma (saldo derivado: Σ comissões − Σ saques ativos; comissão
  recorrente: 2 ciclos aprovados = 2 `Commission`), mappers.
- **E2E** — fluxo completo com mocks MP; `--runInBand`; Postgres/Redis DEV não colidem.

---

## 15. Definição de Pronto (DoD)

- [ ] Admin cria/edita/ativa/desativa afiliado, define `code` e comissão (fixa/percentual/fixa+percentual) + piso de saque.
- [ ] Venda de pingente **paga** atribuída a link gera comissão correta (snapshot).
- [ ] Cada **ciclo pago** de assinatura (1ª e renovações) gera comissão correta, enquanto o cliente pagar.
- [ ] Afiliado vê link, edita dados, vê KPIs, solicita saque e acompanha status.
- [ ] Admin avança saque `recebido → processando → pago` (ou `recusado`), auditado.
- [ ] Saque respeita piso do afiliado **e** nunca excede o saldo disponível (derivado).
- [ ] Comissão estornada se venda reembolsada/cancelada antes do saque.
- [ ] Anti-IDOR: afiliado só enxerga o próprio perfil/saques/metrics.
- [ ] DIP + TDD respeitados; `nest build` EXIT 0; specs `--runInBand` verdes; fronts build/eslint 0.

---

## 16. Fora de escopo (futuro)

- Auto-cadastro de afiliado pelo cliente (por ora admin cria).
- Contagem de cliques / analytics de conversão (funnel).
- Pagamento automático do saque (Pix automático) — por ora admin marca manualmente.
- Período de carência (chargeback) para liberar saldo — comissão libera imediato.
- Hierarquia de afiliados (sub-afiliados / rede).
- Múltiplos níveis / comissão por produto ou por plano específico.

---

## 17. Decisões aprovadas (2026-09-08)

| # | Decisão | Valor |
|---|---|---|
| 1 | Login do afiliado | `User` com email/senha (senha temporária no cadastro) |
| 2 | Base do percentual | **sem frete** (pingente = `unit_price×qty`; assinatura = preço do plano) |
| 3 | Comissão em renovações | **todo ciclo pago** (1ª ativação + renovações, enquanto o cliente pagar) |
| 4 | Status de saque | `RECEIVED / PROCESSING / PAID / REJECTED` |
| 5 | Valor mínimo de saque | **variável por afiliado** (`Affiliate.min_withdrawal_cents`) |
| 6 | Código do link | **definido pelo admin** (slug `[a-z0-9-]{3,32}` único) |
| 7 | Atribuição | **first-click** (cookie 30 dias, primeiro clique vence) |
