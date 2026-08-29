# 📋 PLANO DE IMPLEMENTAÇÃO — FASE 7: PLANOS, ASSINATURAS E DADOS PREMIUM

## 🎯 OBJETIVO GERAL

Implementar a monetização do produto: planos **Basic** (gratuito) e **Premium** (pago),
com **Feature System** (gate de funcionalidades por plano), **checkout próprio**
(transparente — PIX/cartão/boleto, sem redirecionamento para o Mercado Pago),
**webhook idempotente** e os **dados Premium** (`PetMedical`, `PetContact`,
histórico de acessos) liberados pelo gate.

> **Localização (`SharedLocation`) e Alertas (`Notification`/`NotificationPreference`)
> NÃO entram nesta fase** — têm RFs próprios (RF15/RF19) e serão tratados em fase separada.

---

## ✅ DECISÕES CONSOLIDADAS (fechadas com o usuário)

| # | Decisão |
|---|---------|
| D1 | **Escopo (b)**: Planos/Assinaturas + Feature System + PetMedical/PetContact/histórico. Localização+Alertas → fase própria. |
| D2 | **Só 2 planos**: `BASIC` e `PREMIUM`. "Premium Plus" cortado (não existe no doc-sistema). |
| D3 | **`SubscriptionStatus` = 5**: `TRIALING/ACTIVE/PAST_DUE/CANCELLED/EXPIRED`. Sem `INCOMPLETE*`. A `Subscription` só nasce quando o pagamento é confirmado. |
| D4 | **Cortar `SubscriptionHistory`** (histórico via `AuditLog`). **Manter `PaymentTransaction`** (reconciliação financeira). |
| D5 | **`WebhookEvent`**: nomes do doc-sistema (`event_id`, `event_type`) + enum `status` (4 estados) + `payload` json. |
| D6 | **FeatureGuard + verificação no use case**. NADA de `FeatureInterceptor` global. |
| D7 | **Mercado Pago, abstração multi-provider**. `PaymentProvider` começa com `MERCADO_PAGO`. |
| D8 | **Expiração lazy, sem cron/fila**. `ACTIVE → EXPIRED` ocorre na consulta (`current_period_end < now`). Renovar = novo checkout por ciclo. |
| D9 | `provider_subscription_id` e `provider_customer_id` **nullable** (sem `preapproval`/Card Vault no modelo B). |
| D10 | **`price_cents Int`** (centavos), não `decimal`/float. |

### Modelo de recorrência (checkout próprio — modelo B)

- O gateway só **cobra avulso** (`POST /v1/payments`) e **notifica via webhook**.
- A `Subscription` é **nossa**: dona do ciclo (`current_period_start/end`).
- **Renovação = novo checkout** por ciclo (sem renovação automática; cartão sem Card Vault).
- Fluxo: `checkout → PaymentTransaction(PENDING) → webhook(approved) → Subscription(ACTIVE)`.

---

## 📦 ESCOPO

### Entra
- `Plan`, `Feature`, `PlanFeature` (Feature System)
- `Subscription`, `PaymentTransaction`, `WebhookEvent`
- `PaymentGatewayPort` + `MercadoPagoGateway` (mock em dev)
- FeatureGuard (`403 FEATURE_NOT_AVAILABLE`)
- `PetMedical`, `PetContact`, histórico de acessos (Premium)

### Não entra (fases futuras)
- `SharedLocation` / localização compartilhada, `Notification` / alertas, modo perdido avançado, `CUSTOM_PROFILE`
- Fila BullMQ, cron jobs (`@nestjs/schedule`), workers
- SDK real do MP (entra plugável na Fase 10; agora mock)
- Swagger, `class-validator`/`class-transformer`
- Endpoints administrativos de planos/assinaturas (Fase 9)
- Renovação automática de cartão (Card Vault)

---

## 🗄️ MODELOS DE DADOS (PRISMA)

### Enums
```prisma
enum PlanInterval       { MONTHLY YEARLY }
enum PaymentProvider    { MERCADO_PAGO }
enum PaymentMethod      { PIX CARD BOLETO }
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELLED EXPIRED }
enum PaymentStatus      { PENDING APPROVED REJECTED REFUNDED CHARGED_BACK }
enum WebhookStatus      { RECEIVED PROCESSED FAILED DUPLICATE }
```

### Plan
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id @default(cuid()) | |
| code | String @unique | `BASIC`, `PREMIUM` |
| name | String | |
| description | String? | |
| price_cents | Int | `0` para Basic |
| currency | String @default("BRL") | |
| interval | PlanInterval @default(MONTHLY) | |
| interval_count | Int @default(1) | |
| is_default | Boolean @default(false) | Basic = true |
| created_at / updated_at | DateTime | |

Relação: `Plan → PlanFeature[]`.

### Feature
| Campo | Tipo |
|---|---|
| id | String @id @default(cuid()) |
| code | String @unique |
| name | String |
| description | String? |
| created_at / updated_at | DateTime |

### PlanFeature
| Campo | Tipo |
|---|---|
| id | String @id @default(cuid()) |
| plan_id | FK → Plan (Cascade) |
| feature_id | FK → Feature (Cascade) |
| created_at | DateTime |

`@@unique([plan_id, feature_id])`.

### Subscription
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id @default(cuid()) | |
| user_id | FK → User (Cascade) | |
| plan_id | FK → Plan (Restrict) | |
| provider | PaymentProvider @default(MERCADO_PAGO) | |
| provider_customer_id | String? | D9 — Card Vault futuro |
| provider_subscription_id | String? | D9 — preapproval futuro |
| status | SubscriptionStatus @default(ACTIVE) | |
| started_at | DateTime | |
| current_period_start | DateTime | |
| current_period_end | DateTime | |
| cancelled_at | DateTime? | |
| created_at / updated_at | DateTime | |

Índices: `user_id`, `plan_id`, `status`, `current_period_end`.

### PaymentTransaction (D4 — reconciliação)
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id @default(cuid()) | |
| subscription_id | String? FK → Subscription (SetNull) | preenchido ao ativar |
| user_id | String FK → User (Cascade) | quem iniciou |
| plan_id | String? FK → Plan (SetNull) | |
| provider | PaymentProvider | |
| provider_payment_id | String | id do payment no MP |
| payment_method | PaymentMethod | PIX/CARD/BOLETO |
| amount_cents | Int | |
| currency | String @default("BRL") | |
| status | PaymentStatus @default(PENDING) | |
| created_at / updated_at | DateTime | |

`@@unique([provider, provider_payment_id])`.

### WebhookEvent (D5)
| Campo | Tipo |
|---|---|
| id | String @id @default(cuid()) |
| provider | PaymentProvider |
| event_id | String |
| event_type | String |
| payload | Json |
| status | WebhookStatus @default(RECEIVED) |
| processed_at | DateTime? |
| error | String? |
| received_at | DateTime @default(now()) |
| created_at | DateTime |

`@@unique([provider, event_id])`.

### Cross-phase no User
```prisma
model User {
  // ...
  subscriptions Subscription[]  // DESCOMENTAR (Fase 7 é a dona)
}
```

### PetMedical + PetContact (entram na 7.6)

```prisma
model PetMedical {
  pet_id             String @id  // 1:1
  allergies          String?
  medications        String?
  special_care       String?
  medical_conditions String?
  veterinarian_name  String?
  veterinarian_phone String?
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  pet Pet @relation(fields: [pet_id], references: [id], onDelete: Cascade)
  @@map("pet_medical")
}

model PetContact {
  id           String  @id @default(cuid())
  pet_id       String
  name         String
  phone        String?
  email        String?
  relationship String?
  is_primary   Boolean @default(false)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  pet Pet @relation(fields: [pet_id], references: [id], onDelete: Cascade)
  @@index([pet_id])
  @@map("pet_contacts")
}
```

Relações no `Pet` (descomentar): `medical PetMedical?`, `contacts PetContact[]`.

---

## 🧩 DOMÍNIO

### Entidades (têm identidade `cuid`)
- `Plan` — `code`, `name`, `price`, `isDefault`; invariante: `price >= 0`, `intervalCount >= 1`.
- `Feature` — `code`, `name`.
- `Subscription` — `planId`, `status`, período; métodos: `cancel()`, `expireIfDue(now)`, `renew(period)`.
  - Invariante: `currentPeriodStart < currentPeriodEnd`.
- `PaymentTransaction` — `amount`, `status`, `providerPaymentId`; métodos: `markApproved()`, `markRejected()`, `markRefunded()`.
- `WebhookEvent` — `eventId`, `status`; métodos: `markProcessed()`, `markFailed(error)`, `markDuplicate()`.

### Value Objects
- `Price` — `amountInCents: number` + `currency: 'BRL'` (imutável; `amountInCents >= 0`).
- `PlanInterval` — `MONTHLY | YEARLY`.
- `SubscriptionPeriod` — `start`/`end` com invariante `start < end`.
- `SubscriptionStatus`, `PaymentStatus`, `WebhookStatus`, `PaymentMethod`, `PaymentProvider` — enums tipados.

---

## 🔌 PORTAS (DIP)

| Porta | Local | Contrato |
|---|---|---|
| `PlanRepositoryPort` | `plans/domain` | `findAll`, `findById`, `findByCode`, `findDefault` |
| `FeatureRepositoryPort` | `plans/domain` | `findByCode`, `findByPlanId` |
| `SubscriptionRepositoryPort` | `subscriptions/domain` | `save`, `findById`, `findByUserId`, `findActiveByUserId` |
| `PaymentTransactionRepositoryPort` | `subscriptions/domain` | `save`, `findByProviderPaymentId` |
| `WebhookEventRepositoryPort` | `subscriptions/domain` | `save`, `findByProviderEventId` |
| `PaymentGatewayPort` | `subscriptions/domain/gateways` | `createPayment(input)` |
| `PaymentWebhookValidatorPort` | `subscriptions/domain/gateways` | `validate(headers, rawBody): boolean` |
| `FeatureAccessPort` | `common/ports` (transversal) | `hasFeature(userId, code)`, `listFeatures(userId)` |

### `PaymentGatewayPort` (checkout próprio)
```ts
interface CreatePaymentInput {
  amountCents: number;
  method: PaymentMethod;      // PIX | CARD | BOLETO
  payerEmail: string;
  description: string;
  // CARD: cardToken (do MercadoPago.js no front)
  cardToken?: string;
}

interface CreatePaymentResult {
  providerPaymentId: string;
  status: PaymentStatus;
  // PIX
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  // BOLETO
  boletoUrl?: string;
  // CARD
  cardApproved?: boolean;
}
```
Implementações: `MercadoPagoGateway` (mock em dev — grava/loga e retorna status `PENDING`, simulável) + `LogPaymentGateway`.

---

## ⚙️ USE CASES

### Feature System / Planos
1. `ListPlansUseCase(userId?)` → planos disponíveis com features (Basic/Premium).
2. `CheckFeatureAccessUseCase(userId, featureCode)` → `boolean`. Lógica: assinatura ativa (ACTIVE/TRIALING + período válido) → plano → features do plano → contém o code.
3. `GetUserPlanFeaturesUseCase(userId)` → plano atual + features ativas (para a UI).

### Assinatura / Checkout
4. `InitiateSubscriptionCheckoutUseCase(userId, planId, paymentMethod, cardToken?)`:
   - valida user/plano (não BASIC, ativo);
   - cria `PaymentTransaction(PENDING)`;
   - chama `gateway.createPayment`;
   - retorna dados de pagamento (PIX/boleto/card). **NÃO cria `Subscription` ainda.**
5. `ProcessPaymentWebhookUseCase(headers, rawBody)`:
   - valida assinatura (`PaymentWebhookValidatorPort`);
   - idempotência via `WebhookEvent` (`event_id` único → `DUPLICATE`);
   - mapeia status MP → `PaymentStatus`;
   - se `APPROVED`: cria/renova `Subscription` (ACTIVE, período do plano), linka `PaymentTransaction`, audita.
6. `GetSubscriptionUseCase(userId)` → assinatura atual; aplica `expireIfDue(now)` (D8).
7. `CancelSubscriptionUseCase(userId)` → `cancel()` (status `CANCELLED`, `cancelled_at = now`), audita.

### Dados Premium (7.6)
8. `GetPetMedicalUseCase` / `UpsertPetMedicalUseCase` — gate `PET_MEDICAL` + ownership.
9. `ListPetContactsUseCase` / `CreatePetContactUseCase` / `UpdatePetContactUseCase` / `DeletePetContactUseCase` — gate `MULTIPLE_CONTACTS` + ownership.
10. `ListAccessEventsUseCase(ownerId, petId?)` — gate `ACCESS_HISTORY` + ownership (reusa anti-IDOR de pets).

---

## 🔐 FEATURE SYSTEM (D6)

- `@Feature('PET_MEDICAL')` + `FeatureGuard` → chama `FeatureAccessPort.hasFeature(userId, code)`; sem acesso → **`403 FEATURE_NOT_AVAILABLE`** (doc-sistema `seguranca §4`).
- Todo use case Premium também valida a feature **dentro do use case** (defesa em profundidade, mesmo padrão do `canManage`/ownership).
- Feature codes seedados (só os implementados na Fase 7): `PET_MEDICAL`, `MULTIPLE_CONTACTS`, `ACCESS_HISTORY` — **todos Premium, nenhum Basic**. `LOCATION`, `LOST_MODE_ADVANCED`, `NOTIFICATIONS`, `CUSTOM_PROFILE` entram quando suas fases chegarem.

---

## 🚀 ENDPOINTS

| Método | Endpoint | Autenticação | Use case |
|---|---|---|---|
| GET | `/plans` | JWT | `ListPlansUseCase` |
| GET | `/subscriptions/current` | JWT | `GetSubscriptionUseCase` |
| GET | `/subscriptions/features` | JWT | `GetUserPlanFeaturesUseCase` |
| POST | `/subscriptions/checkout` | JWT | `InitiateSubscriptionCheckoutUseCase` |
| POST | `/subscriptions/cancel` | JWT | `CancelSubscriptionUseCase` |
| POST | `/webhooks/payment` | público (assinatura) | `ProcessPaymentWebhookUseCase` |
| GET | `/pets/:petId/medical` | JWT + `PET_MEDICAL` | `GetPetMedicalUseCase` |
| PUT | `/pets/:petId/medical` | JWT + `PET_MEDICAL` | `UpsertPetMedicalUseCase` |
| GET | `/pets/:petId/contacts` | JWT + `MULTIPLE_CONTACTS` | `ListPetContactsUseCase` |
| POST | `/pets/:petId/contacts` | JWT + `MULTIPLE_CONTACTS` | `CreatePetContactUseCase` |
| PATCH | `/pets/:petId/contacts/:id` | JWT + `MULTIPLE_CONTACTS` | `UpdatePetContactUseCase` |
| DELETE | `/pets/:petId/contacts/:id` | JWT + `MULTIPLE_CONTACTS` | `DeletePetContactUseCase` |
| GET | `/pets/:petId/access-events` | JWT + `ACCESS_HISTORY` | `ListAccessEventsUseCase` |

Validação: **Zod** (`ZodValidationPipe`) em todos os DTOs. Webhook: validação via header `X-Signature` (HMAC) + `X-Request-Id`.

---

## 📐 REGRAS DE NEGÓCIO (doc-sistema)

- **RF20** Assinar Premium → checkout próprio (PIX/cartão/boleto).
- **RF21** Cancelar assinatura → `CancelSubscriptionUseCase`.
- **RF22** Renovar → novo checkout por ciclo; `APPROVED` estende `current_period_end`.
- **RF23** Atualizar via webhook → `ProcessPaymentWebhookUseCase`.
- **RF24** Controlar funcionalidades por plano → `CheckFeatureAccessUseCase` + `FeatureGuard`.
- **RNF09** Idempotência de pagamento/eventos → `WebhookEvent.event_id` único.
- **RNF10** Serviços secundários não derrubam o fluxo principal (gateway mock/erro controlado).
- **Downgrade não apaga dados** (doc-sistema §10): ao expirar/cancelar, `PetMedical`/`PetContact`/`AccessEvent` permanecem, apenas **ocultos** pelo gate.
- **IDOR → 403** (seguranca §1): todos os use cases Premium validam ownership (`pet.ownerId === actorId`).
- **Sem Premium acessa Premium → 403 `FEATURE_NOT_AVAILABLE`** (seguranca §4 caso 2).

---

## 📋 SUB-FASES

| Sub-fase | Entrega | Pausa |
|---|---|---|
| **7.1** ✅ | Schema Prisma (`Plan`, `Feature`, `PlanFeature`, `Subscription`, `PaymentTransaction`, `WebhookEvent` + `PetMedical`/`PetContact` + descomentar `subscriptions` no User) + migration `20260828145250` + seed (2 planos + 3 features) | ✅ |
| **7.2** ✅ | Domínio: entidades + VOs (`Price`, `SubscriptionPeriod`…) + specs (TDD red→green) | ✅ |
| **7.3** ✅ | Feature System: portas + `CheckFeatureAccessUseCase` + `GetUserPlanFeaturesUseCase` + `ListPlansUseCase` + `FeatureGuard` + specs | ✅ |
| **7.4** ✅ | Checkout próprio: `PaymentGatewayPort` + `MercadoPagoGateway` (mock) + `InitiateSubscriptionCheckoutUseCase` + `PaymentTransaction` + specs | ✅ |
| **7.5** ✅ | Webhook: `ProcessPaymentWebhookUseCase` (assinatura HMAC + idempotência + mapper) + `GetSubscriptionUseCase` + `CancelSubscriptionUseCase` + controllers (`/subscriptions/current|checkout|cancel`, `/webhooks/payment`, `/plans`) + specs | ✅ |
| **7.6** ✅ | Dados Premium: `PetMedical` + `PetContact` + `ListAccessEventsUseCase`, gateados por `FeatureGuard` + specs | ✅ |
| **7.7** ✅ | E2E + Postman + docs + encerramento (validação global: lint/build/testes) | ✅ |

---

## 📊 DEFINITION OF DONE

- [x] `GET /plans` lista Basic + Premium (com features)
- [x] `POST /subscriptions/checkout` inicia checkout próprio (PIX/cartão/boleto) sem `checkout_url`
- [x] `POST /webhooks/payment` valida assinatura + idempotência (`event_id` único)
- [x] Pagamento `approved` → `Subscription` ACTIVE (ou renovação estende período)
- [x] `POST /subscriptions/cancel` → `CANCELLED`
- [x] Expiração lazy: `current_period_end < now` → `EXPIRED` (sem cron)
- [x] `FeatureGuard` → `403 FEATURE_NOT_AVAILABLE` para usuário Basic
- [x] `PetMedical`/`PetContact`/`AccessEvent` liberados só para Premium (com anti-IDOR)
- [x] Downgrade/expiração **não apaga** dados Premium (apenas oculta)
- [x] Dados Premium nunca vazam no perfil público (`perfil-privacidade §2`)
- [x] Unitários: specs co-localizados em `__tests__/`, `--runInBand`
- [x] E2E em `test/` (fluxo checkout→webhook→feature)
- [x] `npm run lint` e `npm run build` limpos
- [x] `MEMORY.md` + Postman atualizados
