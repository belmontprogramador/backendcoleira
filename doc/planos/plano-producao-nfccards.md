# PLANO: MÓDULO NFC/QR — PRODUÇÃO (NestJS + Prisma)

> Alinhado ao `skiils/doc-sistema` (produto-identidade, producao-fabricacao,
> modelo-de-dados, apis, requisitos-regras).
> **Fase 3** do `doc/planos/plano-implementacao.md`.
>
> **Revisão 2 (2026-08-27)** — ajustes aprovados pelo Belmont:
> 1. Gravação por **USB ou celular (Web NFC)** — operador escolhe na hora.
> 2. **Regravação idempotente** + **reset** (apagar gravação, manter `publicId`+código).
> 3. **Adesivo = só QR** · **Cartão = só código de ativação** — saídas separadas.
> 4. **Código de ativação criptografado (AES-256-GCM)** em vez de hash —
>    recuperável a qualquer momento; mantido no banco mesmo após a ativação.

## CONTEXTO

O pingente é a **identidade física permanente** do pet (doc-sistema:
"O hardware é a porta de entrada; o backend é o cérebro"). Esta fase entrega a
**produção**: gerar identidades (Public ID + Activation Code), gravar o NFC,
gerar o QR e organizar tudo em **lotes**.

**Princípio central (doc-sistema §produto-identidade):** o NFC e o QR armazenam
**somente uma URL** (`https://dominio.com/p/{publicId}`). Nenhum dado pessoal.

**Fora desta fase:** ativação/ownership (Fase 4), perfil público (Fase 5),
estoque/pedidos (Fase 9 — `inventory:manage`/`order:manage`).

### NFC vs QR — a distinção física (importante)

Ambos carregam a **mesma URL**, mas são coisas diferentes na forma:

| | NFC | QR Code |
|---|-----|---------|
| O que é | Chip dentro do pingente | Imagem impressa (adesivo) |
| Como nasce | Gravação da URL no chip (USB **ou** celular) | URL codificada numa imagem PNG |
| Como o usuário lê | Encosta o celular (NFC) | Escaneia com a câmera |
| Conteúdo | `https://dominio.com/p/{publicId}` | `https://dominio.com/p/{publicId}` |

O QR **não é gravado** no pingente — é **impresso** no adesivo. NFC (gravado)
e QR (impresso) são dois caminhos para a **mesma porta**: o perfil público.
Nenhum dos dois guarda dados do pet; guardam apenas a URL.

---

## 1. REGRA CRÍTICA — QUEM GRAVA NFC

O doc-sistema é explícito (`producao-fabricacao.md §2` + `apis.md §7`):

> A gravação física do NFC é operação de **produção**, executada
> **exclusivamente pelo OPERATOR**. ADMIN e SUPER_ADMIN **não gravam NFC**
> (separação de funções).

| Ação | Permissão | Quem |
|------|-----------|------|
| Gravar NFC (write/report/rewrite) | `tag:record` | **OPERATOR apenas** |
| Resetar gravação (reset) | `tag:record` | **OPERATOR apenas** |
| Verificar NFC | `tag:record` | OPERATOR apenas |
| Reimprimir código (reprint-code) | `tag:write` | OPERATOR, ADMIN |
| Gerar adesivo QR | `tag:write` | OPERATOR, ADMIN |
| Criar/gerar lote | `batch:manage` | OPERATOR, ADMIN |
| Listar/detalhar tags e lotes | `tag:read` | OPERATOR, ADMIN, SUPPORT |

Essas permissões **já existem no seed** (Fase 1). `tag:record` é exclusivo de
OPERATOR na matriz — não precisa criar permissão nova, só respeitar.

### Dois métodos de gravação (operador escolhe na hora)

| Método | Hardware | Fluxo |
|--------|----------|-------|
| **USB** (estação PC) | Leitor NFC no PC | Backend chama `NfcWriterPort`/`NfcReaderPort` (hardware local) |
| **Celular** (Web NFC) | NFC do smartphone | Backend fornece URL + recebe resultado do front (`next-to-write` + `report`) |

> **Web NFC (`NDEFReader`)** só existe em **Android + Chrome** (e exige HTTPS).
> **iPhone não grava via navegador** (Apple bloqueia; exigiria app nativo
> Core NFC). No iPhone o operador usa a estação USB.

---

## 2. MODELO DE DADOS (fonte: doc-sistema §modelo-de-dados §3)

### NfcTag (pingente digital)

```text
NfcTag
------
id                       (cuid, PK)
public_id                (unique)  → URL pública permanente
uid                      (unique, nullable) → UID físico do chip
activation_code_encrypted (string) → código de ativação CRIPTOGRAFADO (AES-256-GCM)
status                   → enum TagStatus (11 estados)
batch_id                 (FK Batch, nullable)
owner_id                 (FK User, nullable)   → preenchido na Fase 4
pet_id                   (FK Pet, nullable)    → preenchido na Fase 4
activated_at             (nullable)            → Fase 4
deactivated_at           (nullable)            → Fase 4
created_at, updated_at
```

Constraints: `public_id UNIQUE`, `uid UNIQUE`.

> **Mudança de segurança (Revisão 2):** `activation_code_hash` (bcrypt,
> irreversível) → **`activation_code_encrypted`** (AES-256-GCM, reversível).
> Motivo: o código precisa ser **recuperável a qualquer momento** (reimprimir
> cartão, reemitir). Nada fica em texto puro no banco — só criptografado.
> A chave de 32 bytes vive em `env` (`ACTIVATION_CODE_ENC_KEY`).

### Batch (lote de produção)

```text
Batch
-----
id              (cuid, PK)
name            (string, único)      → ex: "Lote 001 - Agosto 2026"
description     (string, nullable)   → observações do lote
prefix          (string, nullable)   → prefixo opcional p/ identificação
external_ref    (string, nullable)   → referência externa (ordem de fabricação)
quantity        (int)                → quantidade total planejada
status          (enum BatchStatus)
generated_count (int, default 0)     → tags geradas
written_count   (int, default 0)     → tags gravadas com sucesso
verified_count  (int, default 0)     → tags validadas (write→read→compare)
failed_count    (int, default 0)     → tags com falha
created_by      (FK User)            → operador que criou o lote
started_at      (datetime, nullable) → início da geração/gravação
completed_at    (datetime, nullable) → finalização
cancelled_at    (datetime, nullable) → cancelamento
cancel_reason   (string, nullable)   → motivo do cancelamento
created_at, updated_at
```

> `Batch` é uma **extensão justificada**: o doc-sistema cita "Lote 001,
> Quantidade 1.000" (`producao-fabricacao.md §1`) e `GET /admin/batches`
> (`apis.md §6`), mas não detalha a tabela. Os campos extras (description,
> prefix, external_ref, cancel_reason, started/cancelled_at) dão
> rastreabilidade operacional sem violar nada do doc-sistema.

### NÃO criar (decisões de aderência)

| Entidade | Decisão | Por quê |
|----------|---------|---------|
| `ProductionLog` | ❌ **Não criar** | Redundante com o `AuditLog` existente (doc-sistema §11: "auditar operações"). Usar `AuditLog` com `action: tag_generate / tag_write / tag_verify / tag_reset / tag_reprint / qr_generate`. |
| `QrCode` | ❌ **Não criar** | QR = mesma URL do NFC (derivável de `public_id`). Não há tabela no doc-sistema. O arquivo vai para o storage; referência é opcional. |
| `InventoryItem` | ⏳ **Fase 9** | `RF31` + `inventory:manage`. Estoque é gestão de armazém, não produção. |
| `Order` | ⏳ **Fase 9** | `RF32` + `order:manage`. |
| `Card` / `Sticker` (tabela) | ❌ **Não criar** | Adesivo e cartão são **artefatos de saída** (PNG/código), não entidades. Deriváveis do `publicId` (QR) e do código criptografado (cartão). |

---

## 3. ESTADOS DO PINGENTE (doc-sistema §produto-identidade §9)

**11 estados**:

```text
CREATED → READY → IN_STOCK → SOLD → DELIVERED → AVAILABLE → ACTIVE
                                            ↓
                                  SUSPENDED · LOST · DEACTIVATED · RETIRED
```

| Estado | Significado | Transição nesta fase |
|--------|-------------|----------------------|
| `CREATED` | Gerado, aguardando gravação | → `READY` (write+verify ok) |
| `READY` | NFC gravado e validado | → `IN_STOCK` |
| `IN_STOCK` | Em estoque | → `SOLD` |
| `SOLD` | Vendido | → `DELIVERED` |
| `DELIVERED` | Entregue ao cliente | (Fase 4: → `AVAILABLE` → `ACTIVE`) |
| `AVAILABLE` | Virgem (owner null), pronto p/ ativação | Fase 4 |
| `ACTIVE` | Ativado (owner + pet preenchidos) | Fase 4 |
| `SUSPENDED`/`LOST`/`DEACTIVATED`/`RETIRED` | Ciclo de vida avançado | Fase 4/5 |

**Regra importante:** `ERROR` e `DAMAGED` **não são estados do pingente**.
Falha de gravação → a tag permanece `CREATED` (retry), e o `failed_count` do
lote incrementa. "DAMAGED" é estado de **inventário** (Fase 9), não do pingente.

### Regravação e reset (Revisão 2)

| Operação | Transição | Efeito | Identidade |
|----------|-----------|--------|------------|
| **Gravar/regravar** (write/report) | `CREATED → READY` ou `READY → READY` (idempotente) | Reescreve a URL no chip, atualiza `uid` | Mantém |
| **Reset** (apagar gravação) | `READY → CREATED` | Limpa `uid`, chip volta em branco | **Mantém** `publicId` + código |

> `markWritten(uid)` passa a ser **idempotente**: gravar sobre uma tag já
> `READY` **não** lança `InvalidTagStatusTransitionError` — só atualiza o `uid`
> e mantém `READY`. `reset()` retorna a tag a `CREATED` (apaga a gravação) sem
> descartar a identidade. Isso permite ao OPERATOR **treinar N vezes com o
> mesmo card** e ao cliente/operador **regravar por cima** sem perder a URL.

---

## 4. VALUE OBJECTS (domínio)

### PublicId
- 8 caracteres, alfabeto sem vogais/ambíguos: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Não sequencial, sem revelar dados do usuário (doc-sistema §5)
- Regex: `^[A-Z0-9]{8}$`, único no banco

### ActivationCode
- Formato `XXXX-XXXX` (doc-sistema §4)
- Alfabeto: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Regex: `^[A-Z0-9]{4}-[A-Z0-9]{4}$`
- **Armazenado CRIPTOGRAFADO** (AES-256-GCM) — nunca texto puro em repouso
- Recuperável a qualquer momento (descriptografado sob demanda via `reprint-code`)
- Mantido no banco mesmo após a ativação (Revisão 2)

### Uid
- Formato `XX:XX:XX:XX:XX:XX` (hex maiúsculo)
- Regex: `^([0-9A-F]{2}:){5}[0-9A-F]{2}$`
- Lido do chip físico; único no banco

---

## 5. FLUXO DE GRAVAÇÃO (doc-sistema §producao-fabricacao §2-3)

**Nunca** considerar gravado só porque o `write` retornou sucesso. Obrigatório:

```text
WRITE → READ → COMPARE → PASS
```

- Falha no write/read/compare → retry até **3 tentativas**.
- Após 3 falhas → tag permanece `CREATED`, lote incrementa `failed_count`.
- Sucesso → tag vira `READY`, `uid` preenchido, lote incrementa `written_count`.

### Modo USB (estação PC)

Abstração de hardware (DIP): `NfcWriterPort` + `NfcReaderPort` (interfaces).
Implementação real usa o leitor USB; nos testes usamos mock. O use case depende
só das portas — nunca de hardware concreto.

```text
WriteNfcUseCase
  ├─ NfcWriterPort.write(url)          → grava no chip
  ├─ NfcReaderPort.read()              → lê de volta
  └─ compara read === url              → PASS/FAIL (retry 3x)
```

### Modo Celular (Web NFC)

O backend **não segura o hardware**. Quem grava é o celular do operador; o
backend orquestra:

```text
1. GET /admin/tags/next-to-write?batchId=  → { publicId, url }
2. front grava a URL no chip (Web NFC / NDEFReader)
3. front lê de volta e reporta
4. POST /admin/tags/:publicId/report       → { uid, url, matched }
5. backend valida e marca READY (ou failed_count++)
```

O report do front faz o papel de `read` + `compare`. O backend confia no
resultado reportado (operador autenticado + `tag:record`).

---

## 6. ENDPOINTS (doc-sistema §apis §6)

> ⚠️ Sem prefixo `/admin/production` — seguir o doc-sistema: `/admin/batches`
> e `/admin/tags`.

### Lotes (`/admin/batches`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/admin/batches` | Criar lote | `batch:manage` |
| GET | `/admin/batches` | Listar lotes | `tag:read` |
| GET | `/admin/batches/:id` | Detalhar lote | `tag:read` |
| POST | `/admin/batches/:id/generate` | Gerar tags (Public ID + código **criptografado**; retorna código 1×) | `batch:manage` |
| POST | `/admin/batches/:id/complete` | Finalizar lote | `batch:manage` |
| DELETE | `/admin/batches/:id` | Cancelar lote | `batch:manage` |
| POST | `/admin/batches/:id/qr-zip` | Gerar **adesivos QR** em lote (ZIP) | `batch:manage` |

### Tags (`/admin/tags`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/admin/tags` | Listar tags (filtro por batch/status) | `tag:read` |
| GET | `/admin/tags/next-to-write` | Próxima tag `CREATED` + URL (modo celular) | `tag:record` (OPERATOR) |
| GET | `/admin/tags/:publicId` | Detalhar tag | `tag:read` |
| POST | `/admin/tags/write` | Gravar NFC via USB (write→read→compare) | `tag:record` (OPERATOR) |
| POST | `/admin/tags/:publicId/report` | Reportar gravação do celular | `tag:record` (OPERATOR) |
| POST | `/admin/tags/verify` | Verificar gravação | `tag:record` (OPERATOR) |
| POST | `/admin/tags/:publicId/reset` | **Resetar** (apagar gravação, voltar `CREATED`) | `tag:record` (OPERATOR) |
| POST | `/admin/tags/:publicId/reprint-code` | **Reimprimir cartão** (devolve código descriptografado) | `tag:write` |
| POST | `/admin/tags/:publicId/qr` | Gerar **adesivo QR** individual | `tag:write` |

> ⚠️ `GET /admin/tags/next-to-write` deve ser declarado **antes** de
> `GET /admin/tags/:publicId` (senão "next-to-write" vira `publicId`).

### Artefatos de impressão (saídas separadas, momentos diferentes)

| Artefato | Conteúdo | Quando | Endpoint |
|----------|----------|--------|----------|
| **Adesivo** | Só o QR Code (PNG) | A qualquer momento (URL derivável) | `/admin/tags/:publicId/qr` · `/qr-zip` |
| **Cartão** | Só o código de ativação | Na geração (código 1×) + reimpressão sob demanda | `generate` (retorna) · `/reprint-code` |

---

## 7. ESTRUTURA DO MÓDULO (4 camadas, DDD)

```
src/modules/nfc/
├── domain/
│   ├── entities/
│   │   ├── nfc-tag.entity.ts        # + markWritten idempotente + reset()
│   │   └── batch.entity.ts
│   ├── value-objects/
│   │   ├── public-id.vo.ts
│   │   ├── activation-code.vo.ts
│   │   └── uid.vo.ts
│   ├── repositories/
│   │   ├── nfc-tag.repository.port.ts
│   │   └── batch.repository.port.ts
│   └── services/
│       ├── id-generator.port.ts
│       ├── activation-code-generator.port.ts
│       ├── activation-code-cipher.port.ts   # AES-256-GCM (novo)
│       ├── qr-generator.port.ts
│       ├── nfc-writer.port.ts
│       └── nfc-reader.port.ts
├── application/
│   ├── use-cases/
│   │   ├── create-batch.use-case.ts
│   │   ├── generate-tags.use-case.ts
│   │   ├── complete-batch.use-case.ts
│   │   ├── cancel-batch.use-case.ts
│   │   ├── write-nfc.use-case.ts            # USB
│   │   ├── report-nfc-write.use-case.ts     # celular (novo)
│   │   ├── get-next-tag-to-write.use-case.ts# celular (novo)
│   │   ├── reset-tag.use-case.ts            # novo
│   │   ├── reprint-code.use-case.ts         # novo
│   │   ├── verify-nfc.use-case.ts
│   │   ├── generate-qr.use-case.ts
│   │   └── list-tags.use-case.ts
│   ├── dtos/          # schemas Zod
│   ├── errors.ts
│   └── __tests__/
├── infrastructure/
│   ├── repositories/  # Prisma
│   ├── mappers/
│   ├── generators/    # IdGenerator, ActivationCodeGenerator, ActivationCodeCipher, QrGenerator
│   ├── nfc/           # NfcWriterPort/NfcReaderPort + mocks
│   └── __tests__/
├── presentation/
│   ├── controllers/
│   │   ├── admin-batches.controller.ts
│   │   └── admin-tags.controller.ts
│   └── __tests__/
└── nfc.module.ts
```

**Regras (consolidadas):**
- Zod (NUNCA class-validator).
- Portas para hardware (`NfcWriterPort`, `NfcReaderPort`), geradores, cipher e
  storage — implementação plugável na infraestrutura.
- Auditoria via `AuditLoggerPort` (já global) — actions: `tag_generate`,
  `tag_write`, `tag_verify`, `tag_reset`, `tag_reprint`, `qr_generate`.
- Testes em `__tests__/` co-localizada; e2e em `test/`.

### Criptografia do código de ativação (AES-256-GCM)

```typescript
// Porta (domínio)
interface ActivationCodeCipherPort {
  encrypt(plaintext: string): string;   // → "iv:tag:ciphertext" (hex/base64)
  decrypt(ciphertext: string): string;
}

// Infra (Node crypto nativo — sem dependência nova)
class AesGcmActivationCodeCipher {
  constructor(key: string /* 32 bytes, via env ACTIVATION_CODE_ENC_KEY */) {}
}
```

- `GenerateTagsUseCase`: gera código → `cipher.encrypt(code)` → grava
  `activation_code_encrypted` → retorna o código em texto **uma vez**.
- `ReprintCodeUseCase`: `cipher.decrypt(...)` → devolve o código.
- Ativação (Fase 4): `cipher.decrypt(...)` → compara com o código digitado.

---

## 8. TAREFAS DETALHADAS

### Tarefa 3.1 — Schema Prisma
```text
□ Model NfcTag + enum TagStatus (11 estados)
□ activation_code_encrypted (substitui activation_code_hash)
□ Model Batch + enum BatchStatus
□ Descomentar relação nfc_tags no User (nasce aqui)
□ Constraints unique: public_id, uid
□ Migration + generate
□ env: ACTIVATION_CODE_ENC_KEY (32 bytes) no .env + .env.example + env.validation.ts
```

### Tarefa 3.2 — Domínio (TDD)
```text
□ VOs: PublicId, ActivationCode, Uid (validação + geração)
□ Entidades: NfcTag (transições; markWritten idempotente; reset()), Batch (contadores)
□ Portas: NfcTagRepositoryPort, BatchRepositoryPort
□ Portas de serviço: IdGeneratorPort, ActivationCodeGeneratorPort, ActivationCodeCipherPort, QrGeneratorPort, NfcWriterPort, NfcReaderPort
□ Erros: TagNotFound, DuplicateUid, WriteFailed, InvalidStatusTransition
```

### Tarefa 3.3 — Infra (TDD)
```text
□ PrismaNfcTagRepository + PrismaBatchRepository + mappers
□ IdGenerator (nanoid custom) + ActivationCodeGenerator (crypto) + AesGcmActivationCodeCipher + QrGenerator
□ NfcWriter/NfcReader (mock para testes; real via USB depois)
□ Storage (QR/ZIP) — reutilizar padrão do PetStoragePort
```

### Tarefa 3.4 — Aplicação (TDD)
```text
□ CreateBatch, GenerateTags, CompleteBatch, CancelBatch
□ WriteNfc (USB, write→read→compare, retry 3x, idempotente)
□ GetNextTagToWrite + ReportNfcWrite (celular)
□ ResetTag (READY→CREATED), ReprintCode (decrypt)
□ VerifyNfc, GenerateQr, ListTags
□ Schemas Zod + auditoria
```

### Tarefa 3.5 — Presentation (TDD)
```text
□ AdminBatchesController (/admin/batches)
□ AdminTagsController (/admin/tags) — next-to-write antes de :publicId
□ Guards: tag:record (OPERATOR), tag:write, batch:manage, tag:read
□ Filtro de exceção para erros de domínio
```

### Tarefa 3.6 — E2E + docs
```text
□ E2E: geração em massa, gravação (mock USB), report (celular), reset, reprint, RBAC
□ Postman + MEMORY.md + plano-implementacao atualizado
```

---

## 9. CRITÉRIOS DE ACEITE

1. OPERATOR gera lote e N tags com Public ID + Activation Code **criptografado** (AES-256-GCM).
2. OPERATOR grava NFC por **USB ou celular**; write→read→compare; retry 3x; falha → `CREATED` + `failed_count`.
3. **ADMIN/SUPER_ADMIN não conseguem gravar/resetar NFC** (403 — `tag:record` só OPERATOR).
4. Activation Code **nunca** em texto puro no banco nem em log — só criptografado.
5. Activation Code é **recuperável** via `reprint-code` a qualquer momento.
6. Regravação é **idempotente** (READY→READY não quebra); `reset` apaga a gravação mantendo `publicId`+código.
7. Adesivo (QR) e cartão (código) são **saídas separadas**, em momentos distintos.
8. QR aponta para a mesma URL do NFC.
9. Todas as operações de produção geram `AuditLog`.
10. Estados: apenas os 11 do doc-sistema; transições válidas são respeitadas.

---

## 10. DEPENDÊNCIAS A INSTALAR

```bash
# Geração de IDs curtos + QR code
npm install nanoid qrcode
npm install -D @types/qrcode
```

> `bcrypt` e `zod` já instalados. AES-256-GCM usa `crypto` nativo do Node
> (nenhuma dependência nova). `@nestjs/platform-express` já presente.
> **Nota:** com a troca hash→criptografia, o `bcrypt` deixa de ser usado no
> fluxo do Activation Code (permanece para senha de usuário).
