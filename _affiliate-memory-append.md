
## Área de afiliados (V.15, 2026-09-08)

### Modelo de domínio (novo módulo `affiliates`)
- **Entidades**: `Affiliate` (1:1 opcional com `User`, `user_id` unique nullable), `Commission`, `Withdrawal`.
- **Comissão dinâmica por afiliado**: `CommissionConfig` (VO) com `FIXED | PERCENTAGE | FIXED_PLUS_PERCENTAGE`; percentual em **bps** (1% = 100 bps); **snapshot** na atribuição (mudar a config não afeta comissões já geradas).
- **Cálculo** (base SEM frete): pingente = `unit_price * quantity`; assinatura = `Plan.price_cents`.
- **Link**: `https://elopet.online/?ref=<code>`; `code` **definido pelo admin** (slug `[a-z0-9-]{3,32}`, único, normalizado lowercase).
- **Atribuição first-click**: cookie `elopet_ref` (30 dias), primeiro clique vence; `referralCode` enviado no checkout (pingente E assinatura).
- **Comissão recorrente**: a cada **ciclo pago** de assinatura (1ª ativação + renovações) via `AFFILIATE_COMMISSION_PORT.attributeSubscription`.
- **Saques**: `Withdrawal` com status `RECEIVED → PROCESSING → PAID` (+ `REJECTED`); **piso por afiliado** (`Affiliate.min_withdrawal_cents`); saldo derivado = Σ comissões `AVAILABLE` − Σ saques ativos (`RECEIVED|PROCESSING|PAID`).
- **KPIs**: `AffiliateMetrics` (salesCount, subscriptionsCount, revenueCents, commissionTotalCents, availableCents, withdrawnCents).

### Arquitetura (DIP/TDD)
- **Porta transversal `AFFILIATE_COMMISSION_PORT`** (`common/ports/affiliate-commission.port.ts`): `attributeOrder({orderId, referralCode, baseAmountCents})`, `attributeSubscription({subscriptionId, referralCode, baseAmountCents})`, `revokeOrder`, `revokeSubscription`. **Callers passam referralCode + base (nunca a entidade)** — evita ciclo affiliates ↔ orders/subscriptions.
- **Implementação `AffiliateCommissionService`** (módulo affiliates): resolve afiliado ativo por `code` (normalizado lowercase), calcula comissão (snapshot), persiste `Commission`, audita. Sem referralCode / afiliado inativo → **no-op**.
- **Hooks**: `PayOrderWebhookUseCase` (ORDER→PAID atribui; REFUNDED revoga); `ProcessPaymentWebhookUseCase.handleApproved` (cada ciclo aprovado atribui comissão com `transaction.referralCode` + `plan.price.amountInCents`).
- **`referralCode` persiste em `Order.referral_code` e `PaymentTransaction.referral_code`** — NÃO na `Subscription` (que nasce só no webhook; o referral vive na transaction do checkout, um por ciclo).
- **Módulo `affiliates`**: importa `UsersModule` (`USER_REPOSITORY_PORT` p/ criar User no `CreateAffiliateUseCase`); exporta `AFFILIATE_COMMISSION_PORT`. `orders`/`subscriptions` importam `AffiliatesModule` (sem `forwardRef` — affiliates não depende deles).
- **RBAC**: rotas admin (`/admin/affiliates`, `/admin/withdrawals`) usam `@Roles('ADMIN')`; rotas self (`/affiliate/me`) exigem JWT + vínculo `Affiliate` ativo (anti-IDOR via `user.sub`).

### Endpoints novos
- Admin: `POST/GET /admin/affiliates`, `GET/PATCH /admin/affiliates/:id`, `PATCH /admin/affiliates/:id/status`, `GET /admin/affiliates/:id/metrics`, `GET /admin/withdrawals`, `PATCH /admin/withdrawals/:id/status`.
- Self: `GET/PATCH /affiliate/me`, `GET /affiliate/me/metrics`, `POST/GET /affiliate/me/withdrawals`.
- Checkout: `POST /orders` e `POST /subscriptions/checkout` ganharam `referralCode` opcional no body.

### Schema Prisma (novas tables)
- `affiliates`, `commissions`, `withdrawals` + enums `AffiliateStatus`, `CommissionType`, `CommissionStatus`, `CommissionSource`, `WithdrawalStatus`.
- Migrations: `20260908161455_add_affiliates`, `20260908163732_add_referral_codes`.
- `test/helpers/clean-database.ts` ganhou `commission/withdrawal/affiliate.deleteMany()`.

### Fronts
- **Front admin** (`/dashboard/afiliados` + `/dashboard/afiliados/saques`): lista/criar/editar/ativar-desativar/métricas + avanço de status de saque. Lib `src/lib/affiliates.ts`. Nav "Afiliados" (`HandCoinsIcon`).
- **Front cliente** (`/dashboard/afiliado`): link de afiliado + KPIs + editar dados + solicitar/ver saques. BFF `/api/affiliate/me[/metrics|/withdrawals]`. Nav "Afiliado".
- **Captura `?ref=`**: `ReferralTracker` (client component no layout, dentro de `<Suspense>`) grava cookie `elopet_ref` (first-click); `getReferralCode()` lido nos checkouts (`pingente-checkout.tsx` + `checkout.tsx`) e enviado como `referralCode`.
- **Button do front (base-ui) NÃO tem `asChild`** — usar `<Link className={buttonVariants({variant,size})}>` com `prefetch={false}`, NUNCA `<Button asChild><a>`.

### Decisões fechadas (Belmont, 2026-09-08)
1. Afiliado = `User` com email/senha (senha temporária no cadastro). 2. Base do % **sem frete**. 3. Comissão **recorrente em todo ciclo pago**. 4. Status saque `RECEIVED/PROCESSING/PAID/REJECTED`. 5. Piso de saque **variável por afiliado**. 6. `code` **definido pelo admin**. 7. **first-click** (cookie 30 dias).

### Pitfalls (afiliados)
- **Specs de repositório compartilham o Postgres DEV e colidem em IDs fixos** (`user-1`, `prod-1`, `plan-1`) quando a ordem muda no `--runInBand` — usar **IDs únicos por spec** (prefixo `a-`/`c-`/`w-`).
- `Commission.create` exige `orderId` (source ORDER) ou `subscriptionId` (source SUBSCRIPTION) — FK real necessária no teste de integração.
