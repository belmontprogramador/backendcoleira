# PLANO: MÓDULO ATIVAÇÃO + OWNERSHIP (NestJS + Prisma)

> Alinhado ao `skiils/doc-sistema` (ativacao, produto-identidade, apis,
> modelo-de-dados, requisitos-regras).
> **Fase 4** do `doc/planos/plano-implementacao.md`.

## CONTEXTO

A Fase 4 é o **coração do sistema**: conecta o pingente físico (Fase 3) ao
usuário (Fase 1) e ao pet (Fase 2). Transforma um pingente **virgem**
(`AVAILABLE`) em um pingente **ativo com dono** (`ACTIVE`).

**Princípio central (doc-sistema):** o Public ID **não é credencial**. Só o
código de ativação (single-use, **criptografado** AES-256-GCM) autoriza a ativação.

---

## DECISÕES DE ADERÊNCIA (consolidadas com o dono do produto)

| # | Decisão | Motivo |
|---|---------|--------|
| 1 | `TransferToken` → **Redis efêmero** (reuso `TemporaryTokenStorePort`) | Token é temporário (7 dias); Redis já é o padrão (verify-email/reset) |
| 2 | **Sem** `OwnershipHistory`/`ActivationAttempt` → usar **`AuditLog`** | Doc-sistema §11 já prevê "ativação, transferência, alteração, exclusão" |
| 3 | **Auditoria direta** (sem event bus) | Sistema ainda é linear; event bus só na Fase 6 (notificações) |
| 4 | Ativação aceita `DELIVERED` **ou** `AVAILABLE` (transição automática) | Menos fricção; doc-sistema não prevê passo intermediário |

---

## 1. REGRAS CRÍTICAS (doc-sistema §ativacao)

- **Código de ativação:** aleatório, único, secreto, **criptografado** no banco (AES-256-GCM), **single-use**.
- **Public ID não é credencial** — encontrar o pingente não permite ativar.
- **Após ativação:** `AVAILABLE → ACTIVE`. O código não é mais necessário.
- **Desvinculação:** `owner_id=null`, `pet_id=null`, `status=AVAILABLE` + **mantém o mesmo `publicId` e código** (o cliente apaga os dados sem perder a identidade do card).
- **Substituição:** o **Pet permanece o mesmo**; perfil/histórico/assinatura permanecem. Só o hardware muda.
- **IDOR:** nunca confiar em ID do frontend; sempre verificar `owner_id === user_id` no backend.

---

## 2. ENDPOINTS (doc-sistema §apis §2 — prefixo `/nfc`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/nfc/:publicId` | Status do pingente (virgem? ativo?) | Público |
| POST | `/nfc/:publicId/activate` | Ativar com código | Obrigatória (login) |
| POST | `/nfc/:id/associate-pet` | Associar pet à tag | Obrigatória (dono) |
| POST | `/nfc/:id/disassociate-pet` | Desassociar pet | Obrigatória (dono) |
| POST | `/nfc/:id/transfer` | Solicitar transferência | Obrigatória (dono) |
| POST | `/nfc/transfer/accept` | Aceitar transferência (token) | Obrigatória (destinatário) |
| POST | `/nfc/:id/unlink` | Desvincular pingente | Obrigatória (dono) |
| POST | `/nfc/:id/replace` | Substituir pingente | Obrigatória (dono) |
| GET | `/nfc/:id/history` | Histórico de ownership | Obrigatória (dono ou admin) |

> Transferência: o token é gerado no `transfer` e aceito via `accept` (token no body).
> Não há tabela de transferência — o estado vive no Redis.

---

## 3. MODELO DE DADOS (doc-sistema §modelo-de-dados §3)

**Nenhuma tabela nova.** A Fase 4 usa o `NfcTag` (já criado na Fase 3):

```text
NfcTag
------
id, public_id, uid, activation_code_encrypted, status,
owner_id (nullable), pet_id (nullable),
activated_at, deactivated_at, created_at, updated_at
```

- `owner_id`/`pet_id` — preenchidos/limpos nesta fase.
- `status` — transições `DELIVERED/AVAILABLE → ACTIVE`, `ACTIVE → AVAILABLE` (unlink), `ACTIVE → RETIRED` (replace).
- **Auditoria:** `AuditLog` com actions `tag_activate`, `tag_transfer`, `tag_unlink`, `tag_replace`, `tag_associate_pet`, `tag_disassociate_pet`.
- **TransferToken:** Redis (`transfer:<token>` → payload JSON), TTL 7 dias.

---

## 4. FLUXOS PRINCIPAIS

### 4.1 Ativação (`POST /nfc/:publicId/activate`)

```
Cliente logado + código
   ↓
Busca tag por public_id
   ↓
Valida: status ∈ {AVAILABLE, DELIVERED}  (transição automática DELIVERED→AVAILABLE)
   ↓
Valida: owner_id == null (virgem)
   ↓
Descriptografa activation_code_encrypted (AES-GCM) e compara com o código digitado
   ↓
Marca owner_id = user.id, status = ACTIVE, activated_at = now
   ↓
Audita (tag_activate) + registra tentativa
```

### 4.2 Transferência (`/nfc/:id/transfer` → `accept`)

```
Dono solicita (email do destinatário)
   ↓
Gera token (crypto.randomUUID), grava no Redis (TTL 7d)
   ↓
Audita (tag_transfer_requested)
   ↓
Destinatário aceita com token
   ↓
Valida token + destinatário correto
   ↓
owner_id = destinatário.id, pet_id mantido, status = ACTIVE
   ↓
Audita (tag_transfer)
```

### 4.3 Desvinculação (`/nfc/:id/unlink`)

```
Dono desvincula
   ↓
owner_id=null, pet_id=null, status=AVAILABLE
   ↓
Mantém o MESMO publicId e código (identidade preservada)
   ↓
Audita (tag_unlink)
```

### 4.4 Substituição (`/nfc/:id/replace`)

```
Dono indica tag nova
   ↓
Valida: tag nova está AVAILABLE/DELIVERED e sem dono
   ↓
new_tag.pet_id = old_tag.pet_id   ← SÓ isso (o Pet não muda)
new_tag.owner_id = user.id
new_tag.status = ACTIVE
old_tag.status = RETIRED, owner_id=null, pet_id=null
   ↓
Audita (tag_replace)
```

> ⚠️ **NÃO copiar** privacy/medical/contacts/access_history — esses dados vivem
> no **Pet**, não na tag. O perfil permanece porque o Pet é o mesmo.

---

## 5. ESTRUTURA DO MÓDULO (4 camadas, DDD)

```
src/modules/ownership/
├── domain/
│   ├── entities/
│   │   └── (reusa NfcTag — não cria entidade nova)
│   ├── value-objects/
│   │   └── activation-code.vo.ts   ← já existe no módulo nfc (reuso)
│   ├── repositories/
│   │   └── nfc-tag.repository.port.ts   ← já existe (reuso do módulo nfc)
│   └── __tests__/
├── application/
│   ├── use-cases/
│   │   ├── activate-tag.use-case.ts
│   │   ├── associate-pet.use-case.ts
│   │   ├── disassociate-pet.use-case.ts
│   │   ├── request-transfer.use-case.ts
│   │   ├── accept-transfer.use-case.ts
│   │   ├── unlink-tag.use-case.ts
│   │   └── replace-tag.use-case.ts
│   ├── dtos/          # schemas Zod
│   ├── errors.ts
│   └── __tests__/
├── infrastructure/
│   └── (reusa repositórios e serviços dos módulos nfc/users/pets)
├── presentation/
│   ├── controllers/
│   │   └── ownership.controller.ts   # /nfc
│   └── __tests__/
└── ownership.module.ts
```

**Regras (consolidadas):**
- Zod (NUNCA class-validator).
- Reuso de portas: `NfcTagRepositoryPort`, `UserRepositoryPort`, `PetRepositoryPort`,
  `TemporaryTokenStorePort`, `AuditLoggerPort`, `ActivationCodeCipherPort` (decrypt).
- Ownership verificado **no use case** (não no controller), como nas fases anteriores.
- TransferToken no Redis via `TemporaryTokenStorePort` (TTL 7 dias).

---

## 6. SUB-FASES (cada uma com STOP para avaliação)

### Fase 4.1 — Extensão do NfcTag (transições de ativação)
```text
□ Adicionar métodos ao NfcTag: activate(), unlink(), retire(), associatePet(), disassociatePet()
□ Atualizar máquina de transições (AVAILABLE/DELIVERED → ACTIVE, etc.)
□ Testes unitários
```

### Fase 4.2 — Ativação (o coração)
```text
□ ActivateTagUseCase (cipher decrypt + compare + single-use + transição)
□ Schemas Zod + erros
□ Testes unitários
```

### Fase 4.3 — Associação/Desassociação de Pet
```text
□ AssociatePetUseCase, DisassociatePetUseCase (ownership tag + pet)
□ Testes unitários
```

### Fase 4.4 — Transferência
```text
□ RequestTransferUseCase, AcceptTransferUseCase (Redis token TTL 7d)
□ Testes unitários
```

### Fase 4.5 — Desvinculação + Substituição
```text
□ UnlinkTagUseCase (mantém código, apaga dados), ReplaceTagUseCase (só aponta pet_id)
□ Testes unitários
```

### Fase 4.6 — Presentation + E2E + docs
```text
□ OwnershipController (/nfc) + guards
□ Filtro de exceção
□ E2E (fluxo completo + IDOR + transferência + RBAC)
□ Postman + MEMORY.md + plano-implementacao
```

---

## 7. ⚠️ ARMADILHAS DOCUMENTADAS (lições das Fases 1–3)

> Estas são as armadilhas reais que já causaram regressões. **Consultar antes de
> codar qualquer teste/integração.**

### 7.1 DI e NestJS
- **`import type` em parâmetros decorados** (`@Inject`, `@Body`) quebra o build
  (TS1272) e a injeção (o tipo some no runtime → `UndefinedDependencyException`).
  Usar `import` normal para classes injetáveis.
- **NUNCA parâmetro de construtor com default** (`constructor(private x = '...')`):
  o Nest tenta injetar e o `app.init()` **trava para sempre** (sem erro).
- Use cases com portas: `@Injectable()` + `@Inject(TOKEN)` em **cada** dependência.

### 7.2 Prisma 7
- Referential actions em **PascalCase** (`Cascade`, `SetNull`, `Restrict`).
- IDs via `cuid()`, não `autoincrement`.
- **FK `Restrict`** (`batches_created_by_fkey`, `pets_owner_id_fkey`): testes que
  fazem `user.deleteMany()` precisam limpar **na ordem**: `nfcTag → batch →
  petPrivacy → pet → user`. Esquecer = `Foreign key constraint violated`.

### 7.3 Testes
- **E2E e unitários `--runInBand`** (compartilham Postgres/Redis de DEV).
- E2E de auth/throttle precisa de `flushRedis` (rate limit acumula → 429).
- **`nanoid` é ESM**: precisa estar no `transformIgnorePatterns` do
  `jest.config.js` **E** do `test/jest-e2e.json`.
- Testes em `__tests__/` co-localizada; e2e em `test/` raiz.

### 7.4 Build incremental
- `tsc` incremental + `deleteOutDir` pode deixar `dist/` **incompleto** (sem
  `main.js`). Antes de `start:prod`, apagar `tsconfig.build.tsbuildinfo` e `dist/`.

### 7.5 Segurança (Fase 4 específico)
- Código de ativação **nunca** em texto puro no banco nem em log (criptografado AES-256-GCM).
- `activation_code_encrypted` **nunca** exposto no response mapper.
- Ownership: sempre `owner_id === actorId` no use case.

---

## 8. CRITÉRIOS DE ACEITE

1. Cliente ativa pingente virgem com código correto (single-use).
2. Código errado → 400, sem ativar; tentativas registradas no AuditLog.
3. Public ID sozinho **não** ativa (não é credencial).
4. Dono associa/desassocia pet à própria tag (IDOR → 403).
5. Transferência: token Redis TTL 7d, destinatário correto aceita, ownership muda.
6. Desvinculação: mantém publicId + código, apaga dados (owner/pet), tag volta a AVAILABLE.
7. Substituição: novo pingente aponta pro **mesmo pet** (nada copiado).
8. Tudo auditado no `AuditLog`.

---

## 9. DEPENDÊNCIAS

**Nenhuma nova.** Reuso de: `crypto.randomUUID` (nativo), `ActivationCodeCipherPort`
(AES-GCM, módulo nfc), `TemporaryTokenStorePort` (Redis), `AuditLoggerPort`, repositórios existentes.
