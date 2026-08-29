# Planos, Features e Assinaturas

## 1. Basic

O plano Basic fornece:

- NFC;
- QR Code;
- perfil público;
- foto;
- nome;
- espécie;
- raça;
- cidade/região;
- descrição;
- contato;
- modo perdido básico;
- edição do perfil.

---

## 2. Premium

O Premium acrescenta:

- informações médicas;
- alergias;
- medicamentos;
- cuidados especiais;
- veterinário;
- múltiplos contatos;
- histórico de acessos;
- alertas;
- localização compartilhada;
- modo perdido avançado;
- informações comportamentais;
- personalização;
- recursos futuros.

---

## 3. Diferença fundamental entre Basic e Premium

O pingente é o mesmo.

```text
NFC
 ↓
mesma URL
```

O backend decide:

```text
qual plano?
      ↓
quais features?
      ↓
quais informações?
```

Portanto, quando o cliente compra Premium:

**não precisa regravar NFC.**

---

## 4. Feature System

Criar:

```text
Feature
---------
id
code
name
```

Exemplos:

```text
PET_MEDICAL
ACCESS_HISTORY
LOCATION
MULTIPLE_CONTACTS
LOST_MODE_ADVANCED
NOTIFICATIONS
CUSTOM_PROFILE
```

Relacionamento:

```text
Plan
 ↓
PlanFeature
 ↓
Feature
```

---

## 5. Sistema de Assinaturas

Entidade:

```text
Subscription
-------------
id
user_id
plan_id
provider
provider_customer_id
provider_subscription_id
status
started_at
current_period_start
current_period_end
cancelled_at
created_at
updated_at
```

---

## 6. Status de Assinatura

```text
TRIALING
ACTIVE
PAST_DUE
CANCELLED
EXPIRED
```

---

## 7. Compra Premium

```text
Basic
 ↓
Escolhe Premium
 ↓
Checkout
 ↓
Pagamento
 ↓
Gateway
 ↓
Webhook
 ↓
Backend valida
 ↓
Subscription ACTIVE
 ↓
Premium liberado
```

---

## 8. Webhook

Endpoint:

```http
POST /webhooks/payment
```

Deve:

1. verificar autenticidade;
2. identificar evento;
3. localizar assinatura;
4. processar;
5. registrar;
6. impedir duplicidade.

---

## 9. Idempotência

Criar:

```text
WebhookEvent
------------
id
provider
event_id
event_type
processed
received_at
processed_at
```

`event_id` deve ser único.

---

## 10. Downgrade

```text
Premium
 ↓
cancelamento
 ↓
continua ativo até final do período
 ↓
expira
 ↓
Basic
```

Dados Premium não precisam ser destruídos.

---

## 11. Upgrade novamente

```text
Basic
 ↓
Premium
 ↓
dados anteriores continuam disponíveis
```

Isso melhora muito a experiência.
