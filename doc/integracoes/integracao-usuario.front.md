# Integração Frontend — Módulo de Usuários (Painel Admin)

> **Escopo:** tudo que o frontend do painel administrativo precisa para consumir
> o **módulo de usuários** da API Coleira Cachorro (NestJS).
>
> Módulo coberto: **Auth** (sessão) + **`/users/me`** (perfil próprio) +
> **`/admin/users`** (CRUD + RBAC administrativo).
>
> A integração está organizada em **fases incrementais** (§4). Leia primeiro
> os **contratos comuns** (§1) e os **enums** (§2) — eles valem para todas as fases.

---

## Sumário

1. [Contratos comuns (vale para tudo)](#1-contratos-comuns)
2. [Enums & permissões](#2-enums--permissoes)
3. [Referência de endpoints](#3-referencia-de-endpoints)
4. [Fases de integração](#4-fases-de-integracao)
5. [Gaps & pendências do backend](#5-gaps--pendencias-do-backend)
6. [Checklist de aceite](#6-checklist-de-aceite)

---

## 1. Contratos comuns

### 1.1 Base URL e prefixo

- **Não existe prefixo global** (`/api` etc.). As rotas ficam na raiz.
- Dev: `http://localhost:3000` (porta vem de `PORT` no `.env`).

```bash
# Exemplo
GET http://localhost:3000/admin/users
POST http://localhost:3000/auth/login
```

### 1.2 Autenticação

- **Bearer JWT** no header: `Authorization: Bearer <accessToken>`.
- Todas as rotas são **protegidas por padrão** (guard global). As exceções são
  marcadas com `@Public()` no backend e listadas abaixo como *público*.
- **Access token**: TTL padrão **15 min** (`JWT_ACCESS_TTL`, em segundos).
- **Refresh token**: TTL padrão **7 dias** (`JWT_REFRESH_TTL`), com **rotação
  single-use** (a cada refresh, o token usado é invalidado e um novo par é emitido).
- **Reuso de refresh token** (roubo provável) → revoga **toda a cadeia** do
  usuário. O frontend deve tratar 401 no refresh como "sessão encerrada".

**Ciclo recomendado (interceptor axios/fetch):**

```
request → 401? → POST /auth/refresh { refreshToken }
                → 200 → salvar novo par → repetir request original
                → 401 → logout (limpar tokens, redirecionar p/ login)
```

**O token JWT NÃO carrega roles/permissões.** O payload assinado contém apenas
`{ sub, email, iat, exp }`. Roles são resolvidas no servidor a cada request.
Portanto **não decodifique o JWT no frontend para saber a role do usuário** —
veja o gap em §5.

### 1.3 CORS

- CORS é **fail-closed**: só é habilitado se `CORS_ORIGINS` estiver definido no
  `.env` (lista separada por vírgula), com `credentials: true`.
- **Para o painel funcionar no navegador, a origem do frontend precisa estar em
  `CORS_ORIGINS`.** Ex.: `CORS_ORIGINS=http://localhost:5173` (Vite).

### 1.4 Rate limiting (HTTP 429)

| Escopo | Limite | Rotas afetadas |
|---|---|---|
| Global (por IP) | **10 req / min** | todas |
| Auth (por IP) | **5 req / min** | `register`, `login`, `forgot-password`, `reset-password` |

- Importante no painel: `login` é estrito (5/min). Um usuário errando a senha
  repetidamente é bloqueado por IP por 60s — trate o **429** com mensagem amigável.
- Header `Retry-After` (se presente) indica quando tentar de novo.

### 1.5 Formato de erro (NÃO é uniforme — conheça os 3)

O backend tem **três formatos de erro**. Sempre leia `statusCode` (numérico) e
`message`; trate `errors`/`error` como opcionais.

**A. Erro de domínio/negócio** (filtro `AuthExceptionFilter`):

```json
{ "statusCode": 409, "message": "Email já cadastrado: x@y.com" }
```

**B. Erro de validação (Zod)** — só no `400` de body/query inválido:

```json
{
  "statusCode": 400,
  "message": "Validação falhou",
  "errors": { "email": ["Invalid email"], "password": ["Too short"] }
}
```

**C. Exceções do Nest (guards/pipes)** — `401`/`403`/`429`:

```json
{ "statusCode": 403, "message": "Acesso negado", "error": "Forbidden" }
```

**Códigos de status que o módulo de usuários retorna:**

| Código | Significado |
|---|---|
| `200` | OK (GET/PATCH, login, refresh, status/role) |
| `201` | Criado (register, POST /admin/users) |
| `204` | Sem corpo (logout, verify-email, forgot/reset-password, change-password, deletes) |
| `400` | Validação/invariante (ex.: role inválida, usuário já desativado) |
| `401` | Credencial/token inválido, senha incorreta, usuário bloqueado |
| `403` | Sem permissão (hierarquia) ou `Acesso negado` (guard) |
| `404` | Usuário/role não encontrado |
| `409` | Email já em uso |
| `429` | Rate limit |

### 1.6 Convenções de dados

- **camelCase** em request e response (a API é toda camelCase).
- **Datas** serializadas como **ISO 8601 string** (`2026-08-29T14:10:00.000Z`).
- **`phone`** pode ser `null` (não é obrigatório).
- IDs são **UUIDs** (`cuid`/`randomUUID`).

---

## 2. Enums & permissões

### 2.1 Roles (hierarquia)

```
USER < SUPPORT < OPERATOR < ADMIN < SUPER_ADMIN
```

| Role | Uso no painel |
|---|---|
| `USER` | cliente final (dono de pets) |
| `SUPPORT` | atendimento (leitura limitada) |
| `OPERATOR` | produção (grava NFC) |
| `ADMIN` | administração (usuários, pets, assinaturas) |
| `SUPER_ADMIN` | "deus do sistema" — único que gerencia roles/cria admins |

### 2.2 Status de usuário

```
ACTIVE | INACTIVE | BLOCKED | PENDING_VERIFICATION
```

- `PENDING_VERIFICATION` → conta criada, aguardando verificar e-mail.
- `ACTIVE` → normal.
- `BLOCKED` → bloqueado (não loga; refresh revogado).
- `INACTIVE` → soft-deleted (`deleted_at` preenchido).

### 2.3 Regras de quem pode o quê (matriz)

| Ação | Rota | Quem pode | Regra extra |
|---|---|---|---|
| Listar usuários | `GET /admin/users` | `ADMIN`, `SUPER_ADMIN` | — |
| Detalhar usuário | `GET /admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | hierarquia |
| Editar nome/telefone | `PATCH /admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | hierarquia |
| Desativar (soft delete) | `DELETE /admin/users/:id` | `ADMIN`, `SUPER_ADMIN` | hierarquia |
| Bloquear/ativar | `PATCH /admin/users/:id/status` | `ADMIN`+ (perm `user:status`) | hierarquia |
| Alterar role | `PATCH /admin/users/:id/role` | **só `SUPER_ADMIN`** (perm `user:role`) | hierarquia |
| Criar admin/super | `POST /admin/users` | **só `SUPER_ADMIN`** (perm `user:role`) | — |

**Hierarquia (`canManage`)** — vale para detalhar/editar/desativar/status/role:

> Um ator só gerencia um alvo cuja role seja **estritamente inferior** à sua.
> - `ADMIN` **não** gerencia outro `ADMIN` nem `SUPER_ADMIN`.
> - `SUPER_ADMIN` gerencia todos, **exceto** outro `SUPER_ADMIN`.
>
> Violação → `403 HierarchyViolationError` ("Sem permissão hierárquica…").

### 2.4 Valores permitidos por campo

**`PATCH /admin/users/:id/status` → `status`:** apenas `ACTIVE` | `BLOCKED`.

**`PATCH /admin/users/:id/role` → `role`:** `USER` | `SUPPORT` | `OPERATOR` | `ADMIN`.
> ⚠️ `SUPER_ADMIN` **não** é atribuível por promoção. Só nasce via `POST /admin/users`.

**`POST /admin/users` → `role`:** `ADMIN` | `SUPER_ADMIN`.

---

## 3. Referência de endpoints

### 3.1 Auth (público)

#### `POST /auth/login` — 200

```jsonc
// request
{ "email": "admin@coleira.com", "password": "Admin@Dev123!" }
// response
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```
- Erros: `401` credenciais inválidas; `401` usuário bloqueado/desativado; `429` throttle.
- Rate limit: 5/min.

#### `POST /auth/refresh` — 200

```jsonc
// request
{ "refreshToken": "<jwt>" }
// response (novo par — rotação single-use)
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```
- Erros: `401` refresh inválido/revogado/reusado.

#### `POST /auth/logout` — 204

```jsonc
// request
{ "refreshToken": "<jwt>" }
```
- Revoga o refresh token. Sem corpo de resposta.

#### `POST /auth/register` — 201 *(fluxo cliente final — raro no painel)*

```jsonc
// request
{ "name": "João Silva", "email": "joao@email.com", "password": "senhaForte123", "phone": "+5521999999999" }
// response
{ "id": "<uuid>" }
```
- Usuário nasce `PENDING_VERIFICATION`; dispara e-mail de verificação.
- Erros: `409` email já em uso; `400` validação (senha mín. 8).

#### `POST /auth/verify-email` — 204

```jsonc
// request
{ "token": "<token do e-mail>" }
```

#### `POST /auth/forgot-password` — 204

```jsonc
// request
{ "email": "joao@email.com" }
```

#### `POST /auth/reset-password` — 204

```jsonc
// request
{ "token": "<token do e-mail>", "newPassword": "novaSenha456" }
```

> **Sem SMTP configurado (dev):** o envio de e-mail é um `LogEmailSender` que
> **loga o token no console do servidor**, não envia e-mail de verdade. Para
> testar verify/forgot/reset, copie o token do log.

---

### 3.2 `Me` (autenticado)

#### `GET /users/me` — 200

```jsonc
// response
{
  "id": "9f1c…",
  "name": "João S.",
  "email": "joao@email.com",
  "phone": "+5521988887777",
  "status": "ACTIVE",
  "emailVerifiedAt": "2026-08-29T14:10:00.000Z",
  "createdAt": "2026-08-20T10:00:00.000Z",
  "roles": ["ADMIN"],
  "permissions": ["user:read", "user:write"]
}
```
> `roles` são as roles **atribuídas** do usuário; `permissions` são os códigos
> granulares atribuídos (união das roles). Ambos `[]` se sem role.

#### `PATCH /users/me` — 200

```jsonc
// request (ambos opcionais; phone aceita null)
{ "name": "João S.", "phone": "+5521988887777" }
// response = UserResponse
```

#### `PATCH /users/me/password` — 204

```jsonc
// request
{ "currentPassword": "senhaForte123", "newPassword": "novaSenha456" }
```
- Erros: `401` senha atual incorreta; `400` validação (nova senha mín. 8).

#### `DELETE /users/me` — 204

- Soft delete (desativa a própria conta).

---

### 3.3 Admin (`/admin/users`)

#### `GET /admin/users` — 200 *(ADMIN+)*

```jsonc
// query params (todos opcionais)
//   page   = 1 (int > 0)
//   limit  = 20 (int, máx 100)
//   status = ACTIVE | INACTIVE | BLOCKED | PENDING_VERIFICATION
GET /admin/users?page=1&limit=20&status=ACTIVE

// response = envelope com data + meta (paginação de verdade)
{
  "data": [
    { "id": "…", "name": "…", "email": "…", "phone": "…", "status": "ACTIVE", "emailVerifiedAt": "…", "createdAt": "…", "roles": ["ADMIN"], "permissions": ["user:read", "user:status"] },
    { "…": "…" }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```
> `meta.total` = total global (ignora a página); `totalPages = Math.ceil(total / limit)`.

#### `POST /admin/users` — 201 *(só SUPER_ADMIN)*

```jsonc
// request
{ "name": "Novo Admin", "email": "novoadmin@email.com", "password": "senhaForte123", "role": "ADMIN" }
// response
{ "id": "<uuid>" }
```
- Cria um usuário administrativo já `ACTIVE` + e-mail verificado (não passa por verificação).
- `role` aceito: `ADMIN` | `SUPER_ADMIN`.
- Erros: `403` hierarquia (ator não SUPER_ADMIN); `409` email em uso; `404` role inexistente; `400` validação.

#### `GET /admin/users/:id` — 200 *(ADMIN+)*

```jsonc
// response = UserResponse
```
- Erros: `404` usuário não encontrado; `403` hierarquia.

#### `PATCH /admin/users/:id` — 200 *(ADMIN+)*

```jsonc
// request (só name/phone são editáveis; phone aceita null)
{ "name": "Cliente Editado", "phone": "+5521988880000" }
// response = UserResponse
```
- **Não edita** email/senha/role por aqui (role tem rota própria).
- Erros: `404`; `403` hierarquia; `400` validação.

#### `DELETE /admin/users/:id` — 204 *(ADMIN+)*

- Soft delete (usuário vira `INACTIVE` + `deleted_at`).
- Erros: `404`; `403` hierarquia; `400` já desativado.

#### `PATCH /admin/users/:id/status` — 200 *(ADMIN+, perm `user:status`)*

```jsonc
// request
{ "status": "BLOCKED" }   // ACTIVE | BLOCKED
// response = UserResponse
```
- Erros: `403` hierarquia/perm; `404`; `400` validação.

#### `PATCH /admin/users/:id/role` — 200 *(só SUPER_ADMIN, perm `user:role`)*

```jsonc
// request
{ "role": "OPERATOR" }    // USER | SUPPORT | OPERATOR | ADMIN
// response: sem corpo (200 vazio)
```
- **`setRole` substitui (não acumula)**: remove todas as roles do alvo e define UMA.
- Erros: `403` hierarquia (não SUPER_ADMIN, ou alvo SUPER_ADMIN); `400` role inválida; `404`.

---

## 4. Fases de integração

### Fase 1 — Sessão + identidade (login/refresh/me)

**Objetivo:** o painel autentica um admin e carrega o perfil do usuário logado.

- [ ] Configurar `base_url` e origem no `CORS_ORIGINS` do backend.
- [ ] Tela de login → `POST /auth/login` → guardar `accessToken` + `refreshToken`
      (preferir `localStorage`/memória; documentar decisão de segurança).
- [ ] Interceptor de **refresh automático** (ver §1.2).
- [ ] `GET /users/me` para exibir nome/e-mail do usuário logado.
- [ ] `POST /auth/logout` no "sair" (revoga refresh + limpa tokens).
- [ ] Tratamento de `401` (sessão expirada → redirecionar p/ login) e `429`
      (muitas tentativas de login).

**Saída:** header com nome do admin + sessão persistente via refresh.

---

### Fase 2 — Listagem de usuários (read-only)

**Objetivo:** a tela principal do painel lista os usuários cadastrados.

- [ ] `GET /admin/users` com paginação (`page`/`limit`) e filtro por `status`.
- [ ] Tabela com colunas: nome, email, phone, status, role, criado em.
- [ ] Badges de status (mapear os 4 valores de §2.2 → cor/texto).
- [ ] Paginação de verdade: usar `meta.total`/`meta.totalPages` (§5.2 —
      resolvido) para numerar páginas e desabilitar "próxima" na última.
- [ ] Empty state + estado de loading + estado de erro (mensagem de `message`).

**Saída:** tela de listagem funcional com filtro e paginação.

---

### Fase 3 — Detalhe + edição + desativação

**Objetivo:** gerenciar um usuário individual.

- [ ] `GET /admin/users/:id` para o drawer/modal de detalhe.
- [ ] `PATCH /admin/users/:id` para editar **name** e **phone** (form).
- [ ] `DELETE /admin/users/:id` (soft delete) com confirmação.
- [ ] `PATCH /admin/users/:id/status` → toggle **Bloquear / Ativar**.
- [ ] Tratar `403` hierarquia: se o admin tentar editar outro `ADMIN`, a API
      responde 403 — mostrar "sem permissão" (não é bug do front).

**Saída:** ciclo completo de gestão de um usuário cliente.

---

### Fase 4 — RBAC (criação de admin + mudança de role)

**Objetivo:** funcionalidades restritas a `SUPER_ADMIN`.

- [ ] `POST /admin/users` → formulário de criação de admin/super admin
      (campos: name, email, password, role ∈ {ADMIN, SUPER_ADMIN}).
- [ ] `PATCH /admin/users/:id/role` → select de role (USER/SUPPORT/OPERATOR/ADMIN).
- [ ] **Gating de UI por role:** mostrar essas ações apenas para `SUPER_ADMIN`,
      lendo `roles` de `GET /users/me` (ex.: `roles.includes('SUPER_ADMIN')`).
- [ ] Feedback de sucesso/erro (409 email em uso, 403 hierarquia).

**Saída:** painel completo com RBAC, pronto quando o backend expuser roles.

---

### Fase 5 — Polimento

- [ ] Padronizar o tratamento dos 3 formatos de erro (§1.5).
- [ ] Mensagens de `429` (throttle) amigáveis.
- [ ] Loading/empty/error states em todas as telas.
- [ ] Confirmar `CORS_ORIGINS` para produção.
- [ ] (Opcional) `PATCH /users/me/password` no menu do admin.

---

## 5. Gaps & pendências do backend

> Seções **importantes**: o frontend vai bater nessas lacunas. Cada item tem
> proposta de correção no backend — alinhe antes de codar a fase dependente.

### 5.1 ✅ RESOLVIDO — `roles` agora vem em toda resposta de usuário

`UserResponse` agora inclui **`roles: string[]`** em **todas** as rotas que
retornam usuário: `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id`,
`PATCH /admin/users/:id/status`, `GET /users/me` e `PATCH /users/me`.

```json
{
  "id": "9f1c…",
  "name": "João",
  "email": "joao@email.com",
  "phone": null,
  "status": "ACTIVE",
  "emailVerifiedAt": "2026-08-29T14:10:00.000Z",
  "createdAt": "2026-08-20T10:00:00.000Z",
  "roles": ["ADMIN"],
  "permissions": ["user:read", "user:status"]
}
```

**Semântica importante:** `roles` são as roles **ASSIGNADAS** (não as efetivas).
Um usuário `BLOCKED`/`INACTIVE` **continua** exibindo sua role atribuída — é o
comportamento correto para a tela de administração (você quer ver "este usuário
bloqueado tem role ADMIN"). Usuário sem role → `roles: []`.

Com isso a **Fase 2** (coluna "role") e a **Fase 4** (gating de UI por role do
usuário logado via `GET /users/me`) estão destravadas.

### 5.2 ✅ RESOLVIDO — Listagem agora devolve metadados de paginação

`GET /admin/users` agora devolve um **envelope** (não mais array puro):

```json
{
  "data": [ /* UserResponse[] */ ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

- `meta.total` = total **global** de usuários que batem com o filtro (ignora a página).
- `meta.totalPages = Math.ceil(total / limit)`.
- `meta.page`/`meta.limit` ecoam os query params normalizados (defaults 1/20).

Com isso a **Fase 2** (paginação real) está destravada — nada de inferir
"tem mais?" pelo tamanho da página.

### 5.3 ✅ RESOLVIDO — `permissions` agora vem junto de `roles`

Além de `roles`, `UserResponse` agora inclui **`permissions: string[]`** (códigos
granulares: `user:read`, `user:write`, `user:status`, `user:role`, `tag:record`,
etc.) nas **mesmas** rotas. Resolução em lote (UMA consulta), sem N+1.

```json
{ "…": "…", "roles": ["ADMIN"], "permissions": ["user:read", "user:status"] }
```

**Semântica:** `permissions` são as permissões **ASSIGNADAS** (união das roles
atribuídas), deduplicadas e ordenadas alfabeticamente — espelha a semântica de
`roles` (usuário bloqueado continua exibindo as permissões da role atribuída).

Com isso o front pode fazer gating **fino** quando precisar:
`permissions.includes('user:role')` esconde o botão "gerenciar roles" mesmo que,
no futuro, uma role deixe de carregar aquela permissão específica.

---

## 6. Checklist de aceite

**Fase 1** ☐ login OK ☐ refresh automático OK ☐ logout OK ☐ `GET /users/me` OK ☐ 401/429 tratados

**Fase 2** ☐ listagem OK ☐ filtro status OK ☐ paginação page/limit OK ☐ badges de status OK

**Fase 3** ☐ detalhe OK ☐ edição name/phone OK ☐ soft delete OK ☐ bloquear/ativar OK ☐ 403 hierárquico tratado

**Fase 4** ☐ criar admin/super OK ☐ alterar role OK ☐ gating SUPER_ADMIN OK (`GET /users/me` → `roles`)

**Fase 5** ☐ tratamento de erro padronizado ☐ 429 amigável ☐ states completos ☐ CORS produção

---

## Anexo A — Tipos TypeScript sugeridos

```ts
// src/types/api.ts
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION'
export type Role = 'USER' | 'SUPPORT' | 'OPERATOR' | 'ADMIN' | 'SUPER_ADMIN'
export type AssignableRole = 'USER' | 'SUPPORT' | 'OPERATOR' | 'ADMIN'
export type AdminCreateRole = 'ADMIN' | 'SUPER_ADMIN'
export type UserBlockStatus = 'ACTIVE' | 'BLOCKED'

export interface UserResponse {
  id: string
  name: string
  email: string
  phone: string | null
  status: UserStatus
  emailVerifiedAt: string | null // ISO
  createdAt: string // ISO
  roles: Role[] // roles ASSIGNADAS (ex.: ['ADMIN']); vazio se sem role
  permissions: string[] // códigos ASSIGNADOS (união das roles); vazio se sem role
}

export interface PaginatedUsersResponse {
  data: UserResponse[]
  meta: {
    total: number // total global (ignora a página)
    page: number
    limit: number
    totalPages: number // Math.ceil(total / limit)
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Erros (trate os 3 formatos)
export type ApiError =
  | { statusCode: number; message: string }
  | { statusCode: number; message: string; errors?: Record<string, string[]> }
  | { statusCode: number; message: string; error?: string }
```

```ts
// interceptor de refresh (esboço axios)
let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<AuthTokens>(`${BASE_URL}/auth/refresh`, {
    refreshToken: storage.get('refresh_token'),
  })
  storage.set('access_token', data.accessToken)
  storage.set('refresh_token', data.refreshToken)
  return data.accessToken
}

axios.interceptors.response.use(undefined, async (error) => {
  const original = error.config
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true
    try {
      refreshing ??= refreshAccessToken()
      const token = await refreshing
      refreshing = null
      original.headers.Authorization = `Bearer ${token}`
      return axios(original)
    } catch {
      refreshing = null
      storage.clear() // sessão encerrada → login
      return Promise.reject(error)
    }
  }
  return Promise.reject(error)
})
```

---

## Anexo B — Resumo rápido de status code (módulo usuários)

| Rota | Método | Status OK | Requer |
|---|---|---|---|
| `/auth/register` | POST | 201 | público |
| `/auth/login` | POST | 200 | público |
| `/auth/refresh` | POST | 200 | público |
| `/auth/logout` | POST | 204 | público |
| `/auth/verify-email` | POST | 204 | público |
| `/auth/forgot-password` | POST | 204 | público |
| `/auth/reset-password` | POST | 204 | público |
| `/users/me` | GET | 200 | JWT |
| `/users/me` | PATCH | 200 | JWT |
| `/users/me/password` | PATCH | 204 | JWT |
| `/users/me` | DELETE | 204 | JWT |
| `/admin/users` | GET | 200 | ADMIN+ |
| `/admin/users` | POST | 201 | SUPER_ADMIN |
| `/admin/users/:id` | GET | 200 | ADMIN+ |
| `/admin/users/:id` | PATCH | 200 | ADMIN+ |
| `/admin/users/:id` | DELETE | 204 | ADMIN+ |
| `/admin/users/:id/status` | PATCH | 200 | perm `user:status` |
| `/admin/users/:id/role` | PATCH | 200 | perm `user:role` |
