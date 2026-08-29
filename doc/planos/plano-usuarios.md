# PLANO: MÓDULO DE USUÁRIOS + AUTH + RBAC (NestJS + Prisma)

> Alinhado ao `skiils/doc-sistema` (roles, auditoria, rotação de refresh, Zod).
> **Fase 1** do `doc/plano-implementacao.md`.

## CONTEXTO

Plataforma `coleira-cachorro` (NFC + QR para pets). Backend NestJS + TypeScript + Prisma 7 + PostgreSQL + Redis.

Este módulo é o **alicerce de identidade** do sistema: usuários, autenticação e
controle de acesso (RBAC). Tudo que vem depois (pets, pingentes, assinaturas)
depende de um `User` autenticado e autorizado.

---

## 1. ROLES (fonte da verdade: doc-sistema §7)

O doc-sistema define **5 roles**.

```text
USER        → cliente final (dono de pets e pingentes)
SUPPORT     → atendimento (consulta limitada para ajudar clientes)
OPERATOR    → produção (gravação NFC, lotes, estoque, pedidos)
ADMIN       → administração (usuários, pets, assinaturas)
SUPER_ADMIN → "deus do sistema": acesso total, ignora a matriz
```

Hierarquia de poder: `USER < SUPPORT < OPERATOR < ADMIN < SUPER_ADMIN`.

Regras especiais:

- `SUPER_ADMIN` **ignora** a matriz de permissões (bypass total). É o único que
  gerencia roles e permissões.
- `ADMIN` **não** grava NFC (separação de funções).

---

## 2. MODELO DE PERMISSÕES (RBAC granular)

### 2.1 Códigos de permissão

```text
# usuários e acesso
user:read           # listar/ver usuários
user:write          # criar/editar usuários
user:status         # ativar / bloquear usuário
user:role           # alterar role de um usuário

# roles e permissões
role:manage         # CRUD de roles
permission:manage   # associar permissões a roles

# pets
pet:read
pet:write
pet:delete

# pingentes (NfcTag)
tag:read
tag:write           # editar registro lógico do pingente
tag:record          # GRAVAÇÃO FÍSICA DO NFC (produção)
tag:transfer        # transferir / desvincular / substituir

# produção (doc-sistema RF29–RF32)
batch:manage        # geração de lotes
inventory:manage    # estoque
order:manage        # pedidos

# assinaturas
subscription:read
subscription:manage

# auditoria e suporte
audit:read          # consultar AuditLog
support:read        # consulta limitada para atendimento
```

### 2.2 Matriz de permissões por role

| Permissão | ADMIN | OPERATOR | SUPPORT | USER |
|-----------|:-----:|:--------:|:-------:|:----:|
| `user:read` | ✅ | — | ✅¹ | próprio² |
| `user:write` | ✅ | — | — | próprio² |
| `user:status` | ✅ | — | — | — |
| `user:role` | — | — | — | — |
| `role:manage` | — | — | — | — |
| `permission:manage` | — | — | — | — |
| `pet:*` | ✅ | ✅³ | ✅¹ | próprios² |
| `tag:read` | ✅ | ✅ | ✅ | próprios² |
| `tag:write` | ✅ | ✅ | — | — |
| `tag:record` | — | ✅ | — | — |
| `tag:transfer` | ✅ | ✅ | — | próprios² |
| `batch:manage` | ✅ | ✅ | — | — |
| `inventory:manage` | ✅ | ✅ | — | — |
| `order:manage` | ✅ | ✅ | — | — |
| `subscription:*` | ✅ | — | — | — |
| `audit:read` | ✅ | ✅⁴ | — | — |

> `SUPER_ADMIN` não aparece na matriz: o guard faz **bypass** (acesso total).
> As permissões `user:role`, `role:manage` e `permission:manage` são exclusivas
> do `SUPER_ADMIN` (via bypass), não do `ADMIN`.

**Legenda:**
1. `SUPPORT` tem leitura **limitada** (campos não sensíveis) para atender o cliente.
2. `USER` acessa via **ownership** (regras de dono), não via código de permissão.
3. `OPERATOR` lê pets quando precisa localizar o dono de um pingente em produção.
4. `OPERATOR` lê apenas os eventos de auditoria das **suas próprias operações**.

### 2.3 Decisão: quem grava o NFC?

**`tag:record` (gravação física do NFC) pertence exclusivamente ao `OPERATOR`.**

- A gravação é uma operação de **produção** (doc-sistema §46: estação PC + leitor
  NFC). O papel operacional do dia a dia é o `OPERATOR` — e só ele.
- `ADMIN` **não** grava NFC (separação de funções: quem administra não opera a
  linha de produção física).
- `SUPER_ADMIN` tem bypass total, mas gravação **não** é seu papel; a matriz não
  a atribui a ele.
- `SUPPORT` e `USER` **não** gravam NFC.

---

## 3. ENTIDADES (schema Prisma)

```prisma
model User {
  id               String     @id @default(cuid())
  name             String
  email            String     @unique
  password_hash    String
  phone            String?
  status           UserStatus @default(PENDING_VERIFICATION)
  email_verified_at DateTime?
  last_login_at    DateTime?
  created_at       DateTime   @default(now())
  updated_at       DateTime   @updatedAt
  deleted_at       DateTime?

  roles            UserRole[]
  audit_logs       AuditLog[]

  // ⚠️ RELAÇÕES CROSS-PHASE — COMENTADAS ATÉ A FASE DONA NASCER:
  // pets             Pet[]           // → descomentar na Fase 2
  // nfc_tags         NfcTag[]        // → descomentar na Fase 3
  // subscriptions    Subscription[]  // → descomentar na Fase 7

  @@index([status])
  @@index([deleted_at])
  @@map("users")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  BLOCKED
  PENDING_VERIFICATION
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique // USER, SUPPORT, OPERATOR, ADMIN, SUPER_ADMIN
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  users       UserRole[]
  permissions RolePermission[]

  @@map("roles")
}

model Permission {
  id          String   @id @default(cuid())
  code        String   @unique // user:read, tag:record, batch:manage, ...
  resource    String   // users, pets, tags, batches, inventory, orders, ...
  action      String   // read, write, delete, record, manage, ...
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  roles       RolePermission[]

  @@map("permissions")
}

model UserRole {
  id         String   @id @default(cuid())
  user_id    String
  role_id    String
  created_at DateTime @default(now())

  user       User     @relation(fields: [user_id], references: [id], onDelete: CASCADE)
  role       Role     @relation(fields: [role_id], references: [id], onDelete: CASCADE)

  @@unique([user_id, role_id])
  @@index([role_id])
  @@map("user_roles")
}

model RolePermission {
  id            String   @id @default(cuid())
  role_id       String
  permission_id String
  created_at    DateTime @default(now())

  role          Role       @relation(fields: [role_id], references: [id], onDelete: CASCADE)
  permission    Permission @relation(fields: [permission_id], references: [id], onDelete: CASCADE)

  @@unique([role_id, permission_id])
  @@index([permission_id])
  @@map("role_permissions")
}

// ── Auditoria (doc-sistema modelo-de-dados §11 + RF34 + RB28) ──
model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  action     String   // register, login, update, delete, status_change, role_change, ...
  entity     String   // user, pet, tag, role, ...
  entity_id  String?
  metadata   Json?
  ip_hash    String?
  created_at DateTime @default(now())

  user       User?    @relation(fields: [user_id], references: [id], onDelete: SET_NULL)

  @@index([user_id])
  @@index([entity, entity_id])
  @@index([created_at])
  @@map("audit_logs")
}
```

> ### ⚠️ REGRA OBRIGATÓRIA — relações cross-phase (NUNCA ESQUECER)
>
> `Pet`, `NfcTag` e `Subscription` são referenciadas no `User`, mas **só nascem
> nas Fases 2, 3 e 7** (respectivamente). Se as relações ficarem descomentadas
> agora, `prisma migrate`/`prisma generate` **falham** por referência a model
> inexistente.
>
> **Decisão:** na Fase 1, **comentar** as relações `pets`, `nfc_tags` e
> `subscriptions` no model `User` (e qualquer referência cruzada a essas models).
> Descomentar **somente quando** cada model for criada na sua fase:
>
> | Relação no User | Model destino | Fase em que nasce |
> |-----------------|---------------|-------------------|
> | `pets Pet[]` | `Pet` | Fase 2 |
> | `nfc_tags NfcTag[]` | `NfcTag` | Fase 3 |
> | `subscriptions Subscription[]` | `Subscription` | Fase 7 |
>
> **Proibido criar stubs mortos** dessas models só para o schema compilar.
> A relação fica comentada até a fase dona dela. `AuditLog`, `Role`,
> `Permission`, `UserRole` e `RolePermission` **são da Fase 1** e ficam
> descomentadas desde já.

### 3.1 Convenções de schema (forma correta — Prisma 7)

- **Generator** = `prisma-client` (não `prisma-client-js`), com `output` explícito
  em `../src/generated/prisma`.
- **Datasource** = `provider = "postgresql"` **sem** campo `url` — a URL fica em
  `prisma.config.ts` (CLI) e é injetada em runtime via `@prisma/adapter-pg`.
- **IDs** = `String @id @default(cuid())` (não usar `autoincrement`).
- **Snake_case** para colunas e tabelas (`password_hash`, `email_verified_at`,
  `@@map("users")`, etc.).
- **Timestamps** = `created_at DateTime @default(now())` + `updated_at DateTime @updatedAt`.
- **Soft delete** = `deleted_at DateTime?` + índice.
- **Relações** = FK explícita com `@relation(fields: [...], references: [...])` e
  `onDelete` explícito (`Cascade` para tabelas de junção, `SetNull` para auditoria).
  ⚠️ Referential actions em **PascalCase** (`Cascade`, `SetNull`, `Restrict`, `NoAction`) —
  não uppercase (`CASCADE`/`SET_NULL` é inválido no Prisma 7).
- **Nunca** deixar `onDelete` implícito; ser sempre explícito.
- Após editar o schema, sempre rodar `prisma validate` **antes** de `migrate`/`generate`.

---

## 4. REGRAS DE OWNERSHIP (doc-sistema §17 + RB07)
- `USER` só acessa/edita/exclui **seus próprios** recursos (perfil, pets, tags).
- Toda rota privada resolve o recurso e valida `recurso.owner_id === req.user.id`.
- Falha de ownership → `403 FORBIDDEN` (nunca confiar em ID vindo do body).
- `ADMIN`/`OPERATOR`/`SUPPORT` acessam conforme a matriz (§2.2), não por ownership.

---

## 5. ENDPOINTS

### 5.1 Autenticação (públicos)

```http
POST /auth/register         # criar conta (USER)
POST /auth/login            # login → access + refresh
POST /auth/refresh          # rotacionar refresh → novo par de tokens
POST /auth/verify-email     # confirmar e-mail
POST /auth/forgot-password  # solicitar recuperação
POST /auth/reset-password   # resetar senha
POST /auth/logout           # revogar refresh token
```

### 5.2 Usuário autenticado (`/users/me`)

```http
GET    /users/me
PATCH  /users/me
PATCH  /users/me/password
DELETE /users/me            # desativar conta (soft delete + verificações)
```

### 5.3 Admin (`/admin`, requer ADMIN)

```http
GET    /admin/users?page=1&limit=20&status=ACTIVE
GET    /admin/users/:id
PATCH  /admin/users/:id/status
```

> `ADMIN` **não** altera roles nem grava NFC.

### 5.4 Roles e permissões (requer SUPER_ADMIN)

```http
GET    /admin/roles
POST   /admin/roles
PATCH  /admin/roles/:id
DELETE /admin/roles/:id
GET    /admin/permissions
POST   /admin/roles/:id/permissions
PATCH  /admin/users/:id/role
```

---

## 6. SEGURANÇA

- **JWT:** access token (15 min) + refresh token (7 dias).
- **Rotação de refresh token** (doc-sistema §1): a cada `refresh`, o refresh
  token antigo é **invalidado** e um novo é emitido (single-use). Reuso de um
  token já rotacionado → revoga toda a cadeia (detecção de roubo).
  Refresh tokens ficam no Redis com TTL (stateless no client, revogável no server).
- **Password hashing:** `bcrypt` com salt rounds = 12.
- **Rate limiting** (doc-sistema segurança §2): `/auth/login`, `/auth/register`,
  `/auth/forgot-password` — via `@nestjs/throttler` com storage Redis.
- **Verificação de e-mail:** token temporário no Redis (TTL 24h).
- **Recuperação de senha:** token temporário no Redis (TTL 1h).
- **Soft delete:** `deleted_at` (nunca deleção física).
- **IDOR:** verificar `user.id === req.user.id` nas rotas de `USER`.
- **Auditoria:** registrar em `AuditLog` — register, login, update, status_change,
  role_change, soft delete e operações administrativas (doc-sistema RB28).

### 6.1 Exclusão de conta (doc-sistema §44)

Antes do soft delete, o backend deve verificar:

```text
□ pets vinculados
□ pingentes (nfc_tags) vinculados
□ assinaturas ativas
□ transferências pendentes
```

Se houver assinatura ativa ou transferência pendente → **bloquear** a exclusão
com mensagem explicativa. Após a desativação, aplicar política de retenção
(análise de dados, não apagar de imediato).

---

## 7. ESTRUTURA DE PASTAS (Clean Architecture + DIP)

```
src/
├── modules/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── entities/user.entity.ts
│   │   │   ├── value-objects/email.vo.ts
│   │   │   ├── value-objects/password.vo.ts
│   │   │   └── repositories/user.repository.port.ts   # PORTA (interface)
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   ├── get-profile.use-case.ts
│   │   │   │   ├── update-profile.use-case.ts
│   │   │   │   ├── change-password.use-case.ts
│   │   │   │   ├── deactivate-account.use-case.ts
│   │   │   │   ├── list-users.use-case.ts
│   │   │   │   ├── update-user-status.use-case.ts
│   │   │   │   └── update-user-role.use-case.ts
│   │   │   └── dtos/ (Zod schemas)
│   │   │       ├── register-user.schema.ts
│   │   │       ├── update-profile.schema.ts
│   │   │       ├── change-password.schema.ts
│   │   │       ├── list-users.schema.ts
│   │   │       └── user-response.schema.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/prisma-user.repository.ts  # implementa a porta
│   │   │   └── mappers/user.mapper.ts
│   │   ├── presentation/
│   │   │   ├── controllers/users.controller.ts         # /users/me
│   │   │   └── controllers/admin-users.controller.ts   # /admin/users
│   │   └── users.module.ts
│   │
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.module.ts
│       ├── strategies/jwt.strategy.ts
│       ├── strategies/refresh-token.strategy.ts
│       ├── guards/jwt-auth.guard.ts
│       ├── guards/refresh-auth.guard.ts
│       └── dtos/login.schema.ts
│
├── common/
│   ├── guards/roles.guard.ts            # único lugar (não duplicar)
│   ├── guards/ownership.guard.ts        # único lugar
│   ├── decorators/roles.decorator.ts
│   ├── decorators/permissions.decorator.ts
│   ├── decorators/current-user.decorator.ts
│   ├── decorators/public.decorator.ts
│   ├── filters/exception.filter.ts
│   ├── pipes/zod-validation.pipe.ts
│   ├── constants/roles.ts
│   └── interfaces/request-user.interface.ts
```

> **Removido** do plano original: `users.service.ts` e `users.repository.ts` na
> raiz do módulo (quebravam a Clean Architecture) e as duplicatas de
> guards/decorators/DTOs espalhadas. Cada coisa tem **um** lugar canônico.

---

## 8. CRITÉRIOS DE ACEITE

- CRUD de usuários com RBAC (5 roles + permissões da matriz §2.2).
- Ownership garantido (`USER` só vê/edita o próprio perfil).
- Autenticação JWT com **rotação de refresh token**.
- Recuperação de senha (email + token Redis).
- Verificação de e-mail (token Redis).
- Rate limiting em `/login`, `/register`, `/forgot-password`.
- Soft delete com **verificações de exclusão de conta** (§6.1).
- Auditoria em todas as operações sensíveis.
- Teste unitário **antes** de cada use case (TDD).
- Teste de integração dos endpoints principais.
- Validação de entrada com **Zod** (não class-validator).
- Logs estruturados com **Pino** (já configurado na Fase 0).

---

## 9. SEED (dados iniciais)

A seed (`prisma/seed.ts`) deve:

1. Criar as **5 roles**: `USER`, `SUPPORT`, `OPERATOR`, `ADMIN`, `SUPER_ADMIN`.
2. Criar as permissões da §2.1.
3. Associar permissões conforme a matriz §2.2 (incluindo `tag:record` → somente `OPERATOR`).
4. Criar um `SUPER_ADMIN` padrão (email `superadmin@coleira.com`, senha forte rotacionável).
5. Criar um `ADMIN` padrão (email `admin@coleira.com`).

---

## 10. DEPENDÊNCIAS

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/throttler
npm install -D @types/passport-jwt @types/bcrypt
```

> `zod` e `nestjs-pino` já estão instalados (Fase 0). **Não** instalar
> `class-validator`/`class-transformer` — o projeto usa Zod.

---

## 11. FASES DE EXECUÇÃO (com pausa para confirmação)

> ### 🛑 PAUSA OBRIGATÓRIA A CADA FASE
>
> A implementação deste módulo **não** é feita de uma vez. É dividida nas fases
> abaixo, e **ao final de cada fase o agente DEVE PARAR** e aguardar a sua
> confirmação antes de avançar para a próxima. Não emendar uma fase na outra
> sem o seu OK explícito.

| # | Fase | Entregável | Ao final... |
|---|------|-----------|-------------|
| 1.1 | **Schema + migração** | `schema.prisma` (User, Role, Permission, UserRole, RolePermission, AuditLog — relações cross-phase **comentadas**), `migrate dev`, `prisma generate` | **PARAR** → você confere o schema e a migration |
| 1.2 | **Domínio** | `user.entity.ts`, `email.vo.ts`, `password.vo.ts`, `user.repository.port.ts` + **testes unitários** | **PARAR** → você valida a modelagem de domínio |
| 1.3 | **Infraestrutura de persistência** | `prisma-user.repository.ts`, `user.mapper.ts` + **testes de integração** | **PARAR** → você confirma o acesso a dados |
| 1.4 | **Auth (JWT + refresh rotation)** | strategies, guards, `auth.service.ts`, login/register/refresh + **testes** | **PARAR** → você valida o fluxo de autenticação |
| 1.5 | **Use cases de perfil** | register, get/update profile, change password, deactivate account + **testes** | **PARAR** → você confirma os use cases |
| 1.6 | **Admin + RBAC** | roles.guard, permissions, list users, status, role + **testes** | **PARAR** → você valida o RBAC completo |
| 1.7 | **Seed + verificação e-mail/recuperação senha** | `prisma/seed.ts`, rate limiting, tokens Redis + **testes** | **PARAR** → você valida o fechamento do módulo |

> Cada fase respeita **TDD** (teste unitário → teste de integração → implementação)
> e **DIP** (nada de depender de implementação concreta). Nenhuma fase avança
> sem a anterior aprovada.

---

## 12. EXEMPLO DE USO

```bash
# Registrar (público)
POST /auth/register
{ "name": "João Silva", "email": "joao@email.com", "password": "SenhaForte123", "phone": "+5521999999999" }

# Login
POST /auth/login
{ "email": "joao@email.com", "password": "SenhaForte123" }
# → { access_token, refresh_token }

# Meu perfil
GET /users/me
Authorization: Bearer <access_token>

# Admin lista usuários
GET /admin/users?page=1&limit=20&status=ACTIVE
Authorization: Bearer <access_token_admin>
```
