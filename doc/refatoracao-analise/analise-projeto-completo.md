# Análise Global do Projeto — Coleira Cachorro (Fases 1–7)

> **Data:** 2026-08-28
> **Escopo:** `src/` completo (302 arquivos `.ts`, excluindo `__tests__/` e `generated/`), `test/` (e2e), `prisma/`, `doc/`.
> **Objetivo:** varredura de (1) violações de DIP, (2) OWASP Top 10 (2021), (3) verbosidade sintática (DRY).
> **Estado do projeto:** Fases 1–7 concluídas. 133 suítes / 574 unitários PASS; 12 suítes / 69 e2e PASS; lint/build limpos.

---

## 1. Resumo executivo

O projeto está **arquiteturalmente maduro** para o estágio em que se encontra. O
DIP é respeitado na espinha dorsal (todos os use cases injetam portas via
`@Inject(TOKEN)`; zero import de infraestrutura na camada de aplicação/domínio).
A segurança cobre bem os fluxos críticos (bcrypt 12, AES-256-GCM, HMAC
`timingSafeEqual`, anti-IDOR em ~20 use cases, RBAC com hierarquia `canManage`).

**Porém** há lacunas reais, concentradas em três frentes:

1. **Config via `process.env` espalhado na camada de aplicação** (violação de DIP
   e fonte de verdade duplicada).
2. **Endurecimento de produção ausente** (sem CORS explícito, sem Helmet, webhook
   de pagamento fail-open, senha default no seed, revogação de token não imediata).
3. **Duplicação de padrões** (anti-IDOR, `PUBLIC_BASE_URL`, `auth-exception.filter`
   como "god object" de erros).

**Score geral (subjetivo):** DIP 8/10 · OWASP 7/10 · verbosidade 7/10.

---

## 2. Violações de DIP

### 2.1 Estado geral (positivo)

- **Todos os use cases** injetam **portas** (interfaces) via `@Inject(TOKEN)`.
  Nenhum use case importa repositório Prisma ou qualquer implementação concreta.
- Repositórios concretos (`Prisma*Repository`) só aparecem nos `*.module.ts`
  (camada de composição DI do Nest) — local correto para `useClass`.
- Portas transversais vivem em `common/ports/`; portas de domínio vivem no
  próprio módulo. Não há `common` importando `modules/*` **exceto** o filtro de
  exceção (ver D3).

### 2.2 Violações encontradas

| # | Severidade | Local | Descrição |
|---|-----------|-------|-----------|
| D1 | 🟠 | 4 use cases NFC | `process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'` **duplicado** na camada de aplicação. |
| D2 | 🟠 | `common/utils/ip-hash.ts:13` | `process.env.IP_HASH_SALT` lido direto + fallback hardcoded. |
| D3 | 🟡 | `common/filters/auth-exception.filter.ts` | `common/` importa erros de **9 módulos** (`modules/*`) — inversão de camada e "god object" de erros. |
| D4 | 🟢 | `app.module.ts:54-56` | `process.env.LOG_LEVEL` / `process.env.NODE_ENV` direto (raiz de composição). |
| D5 | 🟢 | `seed.runner.ts:172,177` | `process.env.SUPER_ADMIN_PASSWORD` / `ADMIN_PASSWORD` (infraestrutura, deveria vir de `ConfigService`). |

### 2.3 Detalhes

**D1 — `PUBLIC_BASE_URL` em 4 lugares (a mais importante):**

```
generate-qr.use-case.ts:48        const base = process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'
get-next-tag-to-write.use-case.ts:34   const base = process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'
verify-nfc.use-case.ts:54         const base = process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'
write-nfc.use-case.ts:111         const base = process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'
```

A camada de aplicação depende de `process.env` (implementação concreta) em vez
de uma abstração injetada. Além de quebrar o DIP, há **fonte de verdade
duplicada** (mesmo valor + mesmo fallback em 4 arquivos). **Correção:** criar uma
porta `PublicBaseUrlPort` (ou usar `ConfigService` via `@Inject`) e injetar nos 4
use cases.

**D2 — `ip-hash.ts`:**

```ts
const salt = process.env.IP_HASH_SALT ?? 'coleira-ip-hash-salt'
```

Função utilitária (fora do container DI) lê `process.env` diretamente. Além do
DIP, o fallback é um **salt público hardcoded** (ver OWASP A02).

**D3 — `auth-exception.filter.ts` (182 linhas, 27 imports):**

```
import { InvalidCredentialsError } from '../../modules/auth/errors'
import { ... } from '../../modules/users/application/errors'
import { ... } from '../../modules/pets/application/errors'
import { ... } from '../../modules/nfc/application/errors'
... (9 módulos no total)
```

`common/` (camada transversal) depende de `modules/*` — viola a regra de projeto
"NUNCA deixar `common` importando de `modules/*`". O filtro central de erros é
um **"god object"** que conhece todos os domínios e cresce a cada módulo novo.
**Alternativa:** cada erro de domínio carregar seu próprio `HttpStatus` (ex.
classe base `DomainError` com `statusCode`), eliminando o mapeamento central.

---

## 3. Análise OWASP Top 10 (2021)

### 3.1 A01 — Broken Access Control

**🔴 OW1 — Revogação de acesso não é imediata (token de bloqueado segue válido).**
`src/modules/users/infrastructure/repositories/prisma-user-access.repository.ts`

`resolveAccess()` busca o usuário e retorna `{ roles, permissions }` **sem
verificar `status === BLOCKED` nem `deletedAt`**. O login/refresh rejeitam
`BLOCKED`, mas um access token emitido **antes** do bloqueio continua válido até
expirar (JWT `JWT_ACCESS_TTL` = 900s). Um usuário bloqueado por admin consegue
operar por até ~15 min após o bloqueio.

**Correção:** em `resolveAccess`, retornar `null` (ou lançar) quando
`user.status === 'BLOCKED' || user.deletedAt !== null`. O `JwtStrategy.validate`
então falha a autenticação.

✅ **Positivo:** anti-IDOR (`pet.ownerId !== actorId` → 403) aplicado em ~20 use
cases; RBAC 5 roles com hierarquia `canManage` (ator só gerencia role inferior);
`FeatureGuard` para features Premium; perfil público respeita flags de privacidade.

### 3.2 A02 — Cryptographic Failures

**🟠 OW2 — Salt de hash de IP hardcoded como fallback.**
`src/common/utils/ip-hash.ts:13` — `'coleira-ip-hash-salt'` é público no
código-fonte. Se o env `IP_HASH_SALT` não for configurado, o hash SHA-256 do IP
usa um salt conhecido, permitindo brute-force de endereços IP (quebra a
privacidade do visitante prometida no doc-sistema §seguranca).

**Correção:** tornar `IP_HASH_SALT` obrigatório no `envSchema` (sem fallback em
produção) e injetá-lo via `ConfigService`.

✅ **Positivo:** senha com bcrypt cost 12; código de ativação com AES-256-GCM
(chave 32 bytes, IV random); HMAC-SHA256 do webhook com `timingSafeEqual`;
secrets JWT validados com `min(16)`.

### 3.3 A03 — Injection

**🟢 OW3 — `$queryRawUnsafe('SELECT 1')` exposto.**
`src/common/ports/database.port.ts` expõe `$queryRawUnsafe` e
`src/health/health.controller.ts:40` o usa. A query é fixa (sem input do
usuário), portanto **baixo risco**. Registra-se apenas que a porta mantém uma
via de SQL cru disponível para o futuro.

✅ **Positivo:** todo acesso a dados usa Prisma (queries parametrizadas); validação
de entrada com Zod (`ZodValidationPipe`) em todos os DTOs.

### 3.4 A04 — Insecure Design

Sem achado crítico. Decisões conscientes documentadas: checkout próprio com
recorrência nossa (sem vault de cartão, decisão do usuário), expiração lazy sem
cron, gateway mock em dev. O ponto de atenção é a falta de revalidação do
`payment_id` do webhook contra o valor original (ver A08).

### 3.5 A05 — Security Misconfiguration

**🟠 OW4 — Sem `app.enableCors()`.**
`src/main.ts` não configura CORS. Por padrão o Nest não envia headers CORS, o
que impede chamadas cross-origin de navegador (seguro por omissão, mas vai
quebrar qualquer frontend web sem uma política explícita). **Correção:** definir
origens permitidas explicitamente.

**🟠 OW5 — Sem Helmet.**
Nenhum middleware de hardening de headers HTTP (`X-Content-Type-Options`,
`X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`).
**Correção:** `app.use(helmet())` (pacote `helmet`).

**🔴 OW6 — Webhook de pagamento fail-open.**
`src/modules/subscriptions/infrastructure/gateways/mercado-pago-webhook.validator.ts:19-23`

```ts
const secret = this.config.get<string>('MERCADO_PAGO_WEBHOOK_SECRET') ?? ''
if (secret.length === 0) { this.logger.warn(...); return true }
```

O segredo **não está no `envSchema`** (`env.validation.ts`), então em qualquer
ambiente — incluindo produção — se `MERCADO_PAGO_WEBHOOK_SECRET` estiver ausente,
**qualquer payload** forja um "pagamento aprovado" e ativa assinatura Premium.
Deveria ser **fail-closed** em produção.

**Correção:** em `NODE_ENV === 'production'`, lançar erro na inicialização (ou
`return false`) quando o segredo estiver ausente. Adicionar
`MERCADO_PAGO_WEBHOOK_SECRET` ao `envSchema` com `min(32)`.

### 3.6 A06 — Vulnerable and Outdated Components

**🟠 OW7 — `npm audit` aponta 3 vulnerabilidades HIGH (transitivas).**

```
deepmerge-ts (via @prisma/config → prisma) => HIGH
  "DeepmergeTS has stack exhaustion when merging recursive object graphs"
```

A cadeia é `prisma → @prisma/config → deepmerge-ts`. Como `@prisma/config` é
usado pelo **CLI/config** (build-time), o risco em runtime é limitado, mas a
dependência deve ser monitorada até o Prisma subir a versão do `deepmerge-ts`.

### 3.7 A07 — Identification and Authentication Failures

**🔴 OW8 — Senhas padrão hardcoded no seed.**
`src/infrastructure/seed/seed.runner.ts:172,177`

```ts
process.env.SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@123'
process.env.ADMIN_PASSWORD ?? 'Admin@12345'
```

Se o seed rodar sem as envs configuradas, cria `SUPER_ADMIN`/`ADMIN` com senha
pública e conhecida. **Correção:** falhar o seed se as senhas não estiverem
configuradas (sem fallback), ou exigir via `envSchema`.

**🟡 OW9 — Revogação não imediata** (mesmo mecanismo do OW1, sob a ótica de
autenticação). Usuário bloqueado mantém access token por até 15 min.

**🟡 OW10 — `reset-password` sem rate limit dedicado.**
`src/modules/auth/auth.controller.ts` — `register`, `login` e `forgot-password`
têm `@Throttle({ limit: 5, ttl: 60000 })`, mas **`reset-password` não**. O
brute-force do token de reset é limitado apenas pelo `default` (10/min). Baixo
risco se o token tiver alta entropia, mas a rota deveria ter o mesmo throttle.

✅ **Positivo:** login/refresh rejeitam `BLOCKED`; bcrypt 12; rotação de refresh
token; throttle login/register/forgot 5/min com storage Redis.

### 3.8 A08 — Software and Data Integrity Failures

✅ **Positivo:** webhook de pagamento valida `X-Signature` com HMAC-SHA256 +
`timingSafeEqual` (comparação timing-safe). Idempotência por `event_id` evita
reprocessamento duplicado.

⚠️ **Ressalva:** a validação é desabilitada quando o segredo falta (fail-open —
ver OW6). Quando o segredo existe, a integridade está correta.

### 3.9 A09 — Security Logging and Monitoring

**🟡 OW11 — Eventos de autenticação não são auditados.**
A auditoria (`AuditLoggerPort`) é chamada em **30 use cases** (admin, NFC,
ownership, pets, subscriptions), mas **`login`, `logout`, `refresh` e falhas de
login NÃO auditam** (`auth.service.ts` não injeta `AuditLoggerPort`). O
doc-sistema (RF34/RB28) exige auditoria de login. Falhas de login não
registradas dificultam a detecção de brute-force.

✅ **Positivo:** auditoria presente em status_change, role_change, operações NFC,
ownership, pets e webhook de pagamento.

### 3.10 A10 — Server-Side Request Forgery (SSRF)

✅ **Sem SSRF.** `PUBLIC_BASE_URL` é usado apenas para **montar** URLs (QR/links),
nunca para `fetch`/HTTP server-side. O webhook recebe `payment_id`, mas não
dispara requisições para URLs controladas pelo atacante.

---

## 4. Verbosidade Sintática (DRY)

### 4.1 Pontos positivos

- DTOs Zod enxutos (um schema por operação, objetivos).
- Value objects curtos (`Email`, `Password`, `Price`, `PublicId`...).
- Mappers separados e legíveis (a duplicação de `toDomain`/`toPersistence` é o
  custo aceitável do padrão DDD + Prisma snake_case).
- `import type` separado é obrigatório por `isolatedModules` + decorators — **não
  é verbosidade removível** (já validado em fases anteriores).

### 4.2 Oportunidades de redução

| # | Severidade | Local | Problema | Sugestão |
|---|-----------|-------|----------|----------|
| V1 | 🟠 | 13 use cases (pets, contact, access-events, pet-medical, pet-contacts) | `if (pet.ownerId !== actorId) throw new PetOwnerMismatchError()` repetido | Extrair policy `PetOwnership.assertOwner(pet, actorId)` |
| V2 | 🟠 | 6 use cases (ownership) | `if (tag.ownerId !== userId) throw new ...` repetido | Extrair `TagOwnership.assertOwner(tag, userId)` |
| V3 | 🟠 | 4 use cases NFC | `process.env.PUBLIC_BASE_URL ?? 'https://dominio.com'` duplicado | Porta `PublicBaseUrlPort` (mesma correção do D1) |
| V4 | 🟡 | `auth-exception.filter.ts` | "God object" de 182 linhas / 27 imports, cresce a cada módulo | `DomainError` com `statusCode` por classe de erro |
| V5 | 🟡 | 25 mappers (13 infra + 12 response) | Padrão `toDomain`/`toPersistence`/`toResponse` repetido | Aceitável; helper de serialização se quiser reduzir boilerplate |
| V6 | 🟢 | 82 ocorrências | `if (!x) throw new NotFoundError()` | Helper `ensure(x, error)` — cosmético |

### 4.3 Detalhe de V1/V2 (maior duplicação real)

O anti-IDOR por ownership é a regra de negócio mais repetida do sistema:

```ts
// pets/application/use-cases/*.ts (6x)
// contact/application/use-cases/*.ts (3x)
// pet-medical/application/use-cases/*.ts (2x)
// pet-contacts/application/use-cases/*.ts (4x)
// access-events/application/use-cases/*.ts (1x)
if (pet.ownerId !== actorId) throw new PetOwnerMismatchError()
```

```ts
// ownership/application/use-cases/*.ts (6x)
if (tag.ownerId !== userId) throw new TagOwnerMismatchError()
```

São ~20 pontos que repetem a **mesma** regra. Uma policy/domain service
(`assertOwner`) centralizaria a regra e reduziria o risco de uma variação
esquecer o check (que é justamente o vetor de IDOR).

---

## 5. Tabela consolidada de achados

| ID | Eixo | Severidade | Achado | Ação |
|----|------|-----------|--------|------|
| D1 | DIP | 🟠 | `process.env.PUBLIC_BASE_URL` em 4 use cases | Porta `PublicBaseUrlPort` |
| D2 | DIP | 🟠 | `process.env.IP_HASH_SALT` + fallback | ConfigService + env obrigatório |
| D3 | DIP | 🟡 | `common/` importa 9 módulos no filter | `DomainError` com status |
| OW1 | A01 | 🔴 | Bloqueado mantém token por 15 min | Verificar status em `resolveAccess` |
| OW2 | A02 | 🟠 | Salt de IP hardcoded | `IP_HASH_SALT` obrigatório |
| OW6 | A05 | 🔴 | Webhook de pagamento fail-open | Fail-closed em produção |
| OW4 | A05 | 🟠 | Sem `enableCors()` | Política CORS explícita |
| OW5 | A05 | 🟠 | Sem Helmet | `app.use(helmet())` |
| OW7 | A06 | 🟠 | 3 HIGH via `deepmerge-ts` (transitivo Prisma) | Monitorar/atualizar |
| OW8 | A07 | 🔴 | Senha default no seed | Sem fallback, falhar sem env |
| OW10 | A07 | 🟡 | `reset-password` sem throttle | `@Throttle` 5/min |
| OW11 | A09 | 🟡 | Login/logout/falhas não auditam | Auditar auth.service |
| V1 | DRY | 🟠 | Anti-IDOR pet repetido 13x | Policy `PetOwnership` |
| V2 | DRY | 🟠 | Anti-IDOR tag repetido 6x | Policy `TagOwnership` |
| V3 | DRY | 🟠 | `PUBLIC_BASE_URL` duplicado 4x | = D1 |
| V4 | DRY | 🟡 | Filter de erro "god object" | = D3 |

---

## 6. Plano de ação sugerido (ordem de prioridade)

1. **OW6** — webhook fail-closed em produção + segredo no `envSchema` (segurança
   financeira crítica, 15 min).
2. **OW8** — remover senha default do seed (falhar sem env) (10 min).
3. **OW1** — verificar `status`/`deletedAt` em `resolveAccess` (revogação imediata,
   10 min).
4. **D1/V3** — extrair `PublicBaseUrlPort` (elimina 4× `process.env` + DRY, 20 min).
5. **D2/OW2** — `IP_HASH_SALT` obrigatório no envSchema (10 min).
6. **OW4/OW5** — `enableCors()` + Helmet (15 min).
7. **OW11** — auditar login/logout/falhas de login (20 min).
8. **OW10** — throttle em `reset-password` (5 min).
9. **V1/V2** — policies de ownership (reduz duplicação e risco de IDOR, 30 min).
10. **D3/V4** — `DomainError` com `statusCode` (refatoração estrutural, 1h).
11. **OW7** — acompanhar atualização do Prisma para remover `deepmerge-ts`.

---

## 7. Conclusão

O código está **bem estruturado e seguro na maior parte**, com o DIP forte na
espinha (portas + DI) e os fluxos críticos protegidos (senha, NFC, webhook,
anti-IDOR). As fragilidades concentram-se em **hardening de produção** (CORS,
Helmet, fail-closed do webhook, senha default) e em **duplicação de regras de
negócio** (anti-IDOR, `PUBLIC_BASE_URL`) que, além de verbosidade, aumentam o
risco de regressão de segurança no futuro.

**Recomendação:** corrigir os 3 críticos (OW6, OW8, OW1) antes da Fase 8, e
agendar as refatorações D1/V1/V2 como trabalho de higiene junto à próxima fase.
