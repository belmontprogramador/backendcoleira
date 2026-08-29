# PLANO DE IMPLEMENTAÇÃO — FASE 6: CONTATO (Basic) + REGISTRO DE ACESSO

> **Escopo revisado em 2026-08-27** após análise de aderência ao `doc-sistema`.
> A Fase 6 foi reduzida ao que é **Basic**. Localização, alertas e o Feature
> System foram movidos para a **Fase 7** (junto com Premium).

---

## 🎯 OBJETIVO

Permitir que **qualquer pessoa** que encontre um pet entre em contato com o tutor,
sem criar conta e sem nunca expor os dados privados do tutor. Junto, registrar o
acesso ao perfil público (analytics) — a função central do produto:

```text
IDENTIFICAR → CONTATAR
```

---

## 📦 ESCOPO

### Entra na Fase 6

| Item | RF | Feature |
|---|---|---|
| `AccessEvent` — registro de acesso ao perfil público | RF18 | infra (histórico exposto = Premium → Fase 7) |
| `ContactMessage` — mensagem do visitante → tutor | RF14 | Basic |
| `POST /p/:publicId/contact` — endpoint público | RF14 | Basic |
| `GET /contacts`, `GET /contacts/:id`, `PATCH /contacts/:id/read` — inbox do tutor | RF14 | Basic |
| Entrega por **e-mail + WhatsApp** (portas) | RF19 | Basic |

### Fora da Fase 6 (adiado)

| Item | Motivo | Para onde |
|---|---|---|
| `SharedLocation` + localização compartilhada | Premium (planos-assinaturas §2) | Fase 7 |
| `Notification` + `NotificationPreference` + alertas | Premium (§2, perfil-privacidade §11) | Fase 7 |
| Feature System / gate de feature | Feature System é Fase 7 | Fase 7 |
| Histórico de acessos exposto ao tutor | Premium (§10) | Fase 7 |
| SMS / Push | decisão de escopo | Fase futura |
| Fila (BullMQ), workers, circuit breaker, dead letter | Fase 10 | Fase 10 |
| Swagger/OpenAPI, reverse geocoding, spam NLP | over-engineering | adiado |

> ⚠️ **`ContactMessage` ≠ `PetContact`.** `ContactMessage` é a mensagem do
> visitante (Fase 6, Basic). `PetContact` são contatos cadastrados do tutor
> (Fase 7, Premium). Não confundir.

---

## 🗄️ MODELO DE DADOS (PRISMA)

### 1. Enum `AccessSource`

```prisma
enum AccessSource {
  NFC
  QR
  DIRECT
}
```

Um único enum para `AccessEvent.source` e `ContactMessage.source`.
`DIRECT` = link compartilhado/digitação direta da URL (não há como distinguir
NFC de QR pelo backend — RB10 diz que ambos apontam para a mesma URL; a distinção
vem de um query param `?source=nfc|qr` gravado no chip/QR).

### 2. Model `AccessEvent`

```prisma
model AccessEvent {
  id              String       @id @default(cuid())
  pet_id          String?
  nfc_tag_id      String?
  source          AccessSource @default(DIRECT)
  device_type     String?
  ip_hash         String?
  location_approx String?
  created_at      DateTime     @default(now())

  pet Pet?    @relation(fields: [pet_id], references: [id], onDelete: SetNull)
  tag NfcTag? @relation(fields: [nfc_tag_id], references: [id], onDelete: SetNull)

  @@index([pet_id])
  @@index([nfc_tag_id])
  @@index([created_at])
  @@map("access_events")
}
```

`location_approx` fica nullable e é populado na Fase 7 (quando houver
geolocalização por consentimento). Sem stub morto — o modelo é real, o campo é
opcional e preenchido depois.

### 3. Model `ContactMessage`

```prisma
model ContactMessage {
  id           String       @id @default(cuid())
  pet_id       String
  nfc_tag_id   String?
  sender_name  String?
  sender_phone String?
  sender_email String?
  message      String
  source       AccessSource @default(DIRECT)
  ip_hash      String?
  user_agent   String?
  read_at      DateTime?
  created_at   DateTime     @default(now())

  pet Pet     @relation(fields: [pet_id], references: [id], onDelete: Cascade)
  tag NfcTag? @relation(fields: [nfc_tag_id], references: [id], onDelete: SetNull)

  @@index([pet_id])
  @@index([nfc_tag_id])
  @@index([created_at])
  @@map("contact_messages")
}
```

### 4. Relações cross-phase (descomentar/adicionar)

No model `Pet`:

```prisma
  access_events    AccessEvent[]      // ← descomentar (já está comentado como "→ Fase 6")
  contact_messages ContactMessage[]   // ← novo
```

No model `NfcTag` (back-relations):

```prisma
  access_events    AccessEvent[]
  contact_messages ContactMessage[]
```

---

## 🧱 PORTAS (DIP)

| Porta | Local | Métodos | Infra |
|---|---|---|---|
| `AccessEventRepositoryPort` | `access-events/domain/repositories/` | `create(input): Promise<void>` | `PrismaAccessEventRepository` |
| `ContactMessageRepositoryPort` | `contact/domain/repositories/` | `create`, `findById`, `listByPet(petId, {page,limit})`, `markRead(id)` | `PrismaContactMessageRepository` |
| `WhatsAppSenderPort` | `common/ports/` | `sendContactMessage(to, message): Promise<void>` | `LogWhatsAppSender` (mock dev) |
| `EmailSenderPort` (estender) | `common/ports/` (existente) | + `sendContactMessageEmail(to, data)` | `LogEmailSender` (existente) |

- `WhatsAppSenderPort` segue o padrão de `EmailSenderPort`: porta global +
  implementação **log/mock em dev**, plugável em produção (Twilio/WATI).
- `EmailSenderPort` ganha **um método novo** (`sendContactMessageEmail`), sem
  quebrar os existentes.

---

## ⚙️ USE CASES (APPLICATION)

### 1. `RegisterAccessEventUseCase` (access-events)

- **Entrada:** `{ petId?, nfcTagId?, source, deviceType?, ipHash?, locationApprox? }`.
- **Processo:** cria `AccessEvent`. Chamado como **side-effect** pelo
  `GetPublicProfileUseCase`, em **try/catch** — nunca derruba o perfil (RNF10).
- **Sem fila:** INSERT síncrono e rápido; falha → loga e segue.

### 2. `SendContactMessageUseCase` (contact)

- **Entrada:** `{ publicId, senderName?, senderPhone?, senderEmail?, message, source, ipHash?, userAgent? }`.
- **Processo:**
  1. Resolve tag pelo `publicId` → pet (`petId`) → owner (`ownerId`, `phone`).
  2. Cria `ContactMessage` (com `ip_hash`, `user_agent`, `source`).
  3. Envia e-mail ao tutor (`EmailSenderPort.sendContactMessageEmail`) — sempre.
  4. Envia WhatsApp (`WhatsAppSenderPort.sendContactMessage`) se `owner.phone` — try/catch.
  5. Retorna sucesso **mesmo se um canal falhar** (fallback: e-mail é o canal base).
- **Saída:** `{ messageId }` — nunca expõe e-mail/telefone do tutor.

### 3. `ListContactMessagesUseCase` (contact)

- **Entrada:** `{ actorId, petId?, page, limit }`.
- **Anti-IDOR:** se `petId` informado, valida que o pet pertence ao `actorId`;
  senão, lista mensagens de todos os pets do ator. Ordena por `created_at DESC`.

### 4. `GetContactMessageUseCase` (contact)

- **Entrada:** `{ messageId, actorId }`.
- **Anti-IDOR:** resolve a mensagem, resolve o pet, valida `pet.ownerId === actorId`.

### 5. `MarkContactMessageReadUseCase` (contact)

- **Entrada:** `{ messageId, actorId }`.
- **Anti-IDOR:** idem; chama `markRead()` (regra de domínio na entidade).

---

## 🌐 ROTAS

### Públicas (não autenticadas, throttled)

```http
POST /p/:publicId/contact
```

- Body (Zod): `message` (obrigatório, 1..1000), `sender_name` (opcional, ≤100),
  `sender_phone` (opcional, regex), `sender_email` (opcional, email),
  `source` (opcional, enum `nfc|qr|direct`, default `direct`).
- `publicId` validado pelo `publicIdParamSchema` (reuso da Fase 5.4).

### Autenticadas (USER dono, JWT)

```http
GET    /contacts            → listar mensagens (filtro ?petId=, paginação)
GET    /contacts/:id        → ver uma mensagem
PATCH  /contacts/:id/read   → marcar como lida
```

> ⚠️ **Ordem de rotas:** `GET /contacts` e as rotas `/contacts/:id` não colidem,
> mas `PATCH /contacts/:id/read` e `GET /contacts/:id` usam `:id` — sem rota
> estática prefixada, sem risco. Registrar `/contacts/:id/read` com `:id`
> validado (UUID/cuid). **Não** haverá `/contacts/preferences` (isso é Fase 7).

---

## 🔐 SEGURANÇA

- **Rate limit** (throttler + Redis, padrão existente):
  - `POST /p/:publicId/contact`: **5/hora por IP** + **10/hora por publicId**
    (tracker customizado keyed por `publicId`).
- **IP nunca em claro:** `ip_hash` = sha256(ip + salt) — mesmo padrão do `AuditLog`.
- **Spam heurística (sem NLP):** tamanho ≤1000, razão de maiúsculas, repetição de
  caracteres, regex de link suspeito. Não adicionar dependência externa.
- **Nunca expor dados do tutor** na resposta pública (só `messageId`).
- **Anti-IDOR** em todas as rotas do tutor (só dono do pet vê/marca as mensagens).

---

## 🛡️ RESILIÊNCIA

- Registro de acesso: try/catch, nunca derruba `GET /p/:publicId`.
- Envio de contato: e-mail sempre; WhatsApp se `phone`; falha de canal → loga e
  responde sucesso. **Sem fila** (disparo síncrono com fallback).
- Função central `IDENTIFICAR → CONTATAR` nunca para (infra §7, RNF10).

---

## 🧪 TESTES

- Unitários co-localizados `__tests__/`: entities (`AccessEvent`, `ContactMessage`
  com `markRead`), use cases (5), schemas Zod.
- Integração: `PrismaAccessEventRepository`, `PrismaContactMessageRepository`.
- E2E (`test/contact.e2e-spec.ts`): fluxo completo — cria pet ativado → `POST
  /p/:publicId/contact` (sem token) → tutor `GET /contacts` → `PATCH read`;
  rate limit 429; 404 publicId inexistente; anti-IDOR (tutor B não vê mensagem
  do tutor A).
- **Ordem de limpeza (e2e + integração):** `accessEvent → contactMessage →
  nfcTag → batch → petPrivacy → pet → ... → user` (novos models com FK para
  Pet/NfcTag entram **antes** de `nfcTag`).

---

## 📌 SUB-FASES (pausa obrigatória a cada uma)

| # | Sub-fase | Entrega |
|---|---|---|
| 6.1 | Schema + migration ✅ | `AccessEvent`, `ContactMessage`, `AccessSource`; relações no `Pet`/`NfcTag`; migration + `prisma generate`; specs de mapper/entity |
| 6.2 | AccessEvent ✅ | `AccessEventRepositoryPort` + `PrismaAccessEventRepository` + `RegisterAccessEventUseCase`; integração no `GetPublicProfileUseCase` (side-effect); specs |
| 6.3 | ContactMessage ✅ | `ContactMessageRepositoryPort` + `PrismaContactMessageRepository` + entity `ContactMessage.markRead()`; specs |
| 6.4 | Envio de contato ✅ | `WhatsAppSenderPort` + `LogWhatsAppSender`; `EmailSenderPort.sendContactMessageEmail`; `SendContactMessageUseCase`; specs |
| 6.5 | Rotas ✅ | `contact.schema.ts` (Zod) + `POST /p/:publicId/contact` público + `ContactController` + rate limit dedicado (`contact-ip`/`contact-publicId`); specs |
| 6.6 | Inbox do tutor ✅ | `ListContactMessagesUseCase`/`GetContactMessageUseCase`/`MarkContactMessageReadUseCase` + `GET/PATCH /contacts` autenticado + anti-IDOR; specs |
| 6.7 | E2E + Postman + docs ✅ | `test/contact.e2e-spec.ts` (7 testes); coleção Postman (seção "Contato — Fase 6"); `plano-implementacao.md`/`MEMORY.md` atualizados; lint + build limpos |

---

## ✅ DEFINITION OF DONE (Fase 6)

```text
[x] Testes unitários + integração + e2e passando (--runInBand)
[x] Regra de negócio no domínio (entity ContactMessage.markRead; validações no use case)
[x] DIP respeitado (portas AccessEvent/ContactMessage/WhatsApp; nada concreto no domínio)
[x] Migration aplicada e revertível
[x] Endpoint público sem expor dados do tutor
[x] Anti-IDOR comprovado por e2e
[x] Rate limit por IP + publicId ativo
[x] IP armazenado apenas como hash
[x] ESLint limpo + build de produção exit 0
[x] MEMORY.md e plano-implementacao.md atualizados
```
