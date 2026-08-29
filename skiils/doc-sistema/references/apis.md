# APIs e Autenticação

## 1. Autenticação

Endpoints:

```http
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/verify-email
POST /auth/forgot-password
POST /auth/reset-password
```

Utilizar:

- password hashing;
- access token;
- refresh token;
- expiração;
- rotação de refresh tokens.

---

## 2. API de Pingentes

```http
GET /nfc/:publicId
POST /nfc/:publicId/activate
POST /nfc/:id/unlink
POST /nfc/:id/transfer
POST /nfc/:id/replace
```

---

## 3. API de Pets

```http
GET /pets
POST /pets
GET /pets/:id
PATCH /pets/:id
DELETE /pets/:id
POST /pets/:id/lost
POST /pets/:id/found
```

---

## 4. API Pública

```http
GET /p/:publicId
```

> Nota: a URL amigável do NFC/QR é `/p/{publicId}` (ver `produto-identidade.md` e
> `ativacao.md`; a Fase 3 grava essa URL no chip). `contact` e `location` são da
> Fase 6 (contato/localização).

O endpoint público nunca deverá retornar dados administrativos.

---

## 5. API de Assinatura

```http
GET /subscriptions
POST /subscriptions/checkout
POST /subscriptions/cancel
POST /subscriptions/reactivate
```

---

## 6. API Administrativa

```http
GET /admin/users
GET /admin/pets
GET /admin/tags
GET /admin/batches
GET /admin/inventory
GET /admin/orders
GET /admin/subscriptions
GET /admin/events
```

---

## 7. Roles

```text
USER
SUPPORT
OPERATOR
ADMIN
SUPER_ADMIN
```

Papéis:

- **USER** — cliente final (dono de pets e pingentes).
- **SUPPORT** — atendimento (consulta limitada).
- **OPERATOR** — produção (gravação física do NFC, lotes, estoque, pedidos).
- **ADMIN** — administração (usuários, pets, assinaturas). Não grava NFC.
- **SUPER_ADMIN** — "deus do sistema": acesso total, ignora a matriz de permissões.
