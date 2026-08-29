# Análise do Módulo de Usuários + Auth + RBAC

> **Data:** 2026-08-26
> **Escopo:** `src/modules/users/`, `src/modules/auth/`, `src/common/` (guards, decorators, filters, pipes)
> **Objetivo:** varredura de segurança (OWASP), verbosidade e violações de DIP.

---

## 1. Resumo executivo

O módulo é **arquiteturalmente sólido**: Clean Architecture com 4 camadas bem
definidas, DIP respeitado nos repositórios/portas, TDD aplicado (93 testes
passando) e RBAC com 5 roles implementado. **Porém**, há lacunas de segurança
reais (algumas críticas) e alguns pontos de verbosidade/acoplamento.

**Score geral (subjetivo):** segurança 6/10 · verbosidade 7/10 · DIP 8/10.

---

## 2. Análise OWASP

Referência: OWASP Top 10 (2021) + OWASP API Security Top 10 (2023).

### 🔴 CRÍTICO

#### 2.1 [A07] Usuário bloqueado continua logando
**Arquivo:** `src/modules/auth/auth.service.ts:56`

O `login` verifica apenas `user.deletedAt !== null`, mas **não verifica
`user.status === UserStatus.BLOCKED`**. Um usuário bloqueado por admin
(`BLOCKED`) consegue autenticar e obter tokens normalmente.

```ts
// atual (falha)
if (!user || user.deletedAt !== null) {
  throw new InvalidCredentialsError()
}
```

**Impacto:** inutiliza a função de bloqueio (`update-user-status` → BLOCKED),
que é uma das ações centrais de moderação do admin.

**Correção:**
```ts
if (!user || user.deletedAt !== null || user.status === UserStatus.BLOCKED) {
  throw new InvalidCredentialsError()
}
```
Aplicar também no `refresh` (evitar que token pré-bloqueio continue renovando).

#### 2.2 [A02] Verificação de email nunca dispara o envio
**Arquivos:** `register-user.use-case.ts`, `request-password-reset.use-case.ts`

A porta `EmailSenderPort.sendVerificationEmail()` **existe mas nunca é chamada**.
O `register` cria o usuário com `PENDING_VERIFICATION`, mas **não gera** o token
`verify:<token>` nem envia email. O `verify-email.use-case.ts` só consome
(`consume('verify:...')`) um token que ninguém criou.

**Impacto:** o fluxo de verificação de email está quebrado/inoperante. Contas
ficam eternamente `PENDING_VERIFICATION`, e o endpoint `/auth/verify-email`
só funciona com token injetado manualmente (como nos testes).

**Correção:** no `RegisterUserUseCase`, após salvar o usuário, gerar o token,
armazená-lo (`TemporaryTokenStorePort.save('verify:<token>', user.id, 86400)`)
e chamar `EmailSenderPort.sendVerificationEmail(...)`.

#### 2.3 [A01] `verify-email` não valida que o email pertence ao token
**Arquivo:** `src/modules/auth/use-cases/verify-email.use-case.ts`

O token guarda o `userId`, mas o use case busca o usuário por `email` (do body),
não por `id` (do token). Um token emitido para o usuário A poderia, em tese,
verificar o email de B se B for passado no body — o vínculo token→usuário não é
respeitado.

```ts
const userId = await this.tokens.consume(`verify:${token}`)  // ← userId ignorado
const user = await this.users.findByEmail(email)             // ← usa email do body
```

**Correção:** usar `findById(userId)` (já que o token carrega o id) e ignorar
o `email` do body, ou validar que `email === user.email.value`.

### 🟠 ALTO

#### 2.4 [A02] `verify()` tenta access secret e depois refresh secret no mesmo método
**Arquivo:** `src/infrastructure/auth/jwt-token.service.ts`

O método `verify(token)` faz fallback silencioso entre os dois segredos. Se um
access token malformado for passado ao fluxo de refresh, ele tenta validar com o
segredo de refresh. Funcional, mas **mistura confiança de dois tipos de token**
em uma única primitiva.

**Correção sugerida:** separar `verifyAccess(token)` e `verifyRefresh(token)` na
porta `TokenServicePort`, cada um validando exclusivamente com seu segredo. Isso
elimina a ambiguidade e reforça que refresh token só é aceito no refresh.

#### 2.5 [A07] `request-password-reset` não limita por IP o brute-force de enumeração
**Arquivo:** `request-password-reset.use-case.ts`

O endpoint `/auth/forgot-password` tem `@Throttle(5/60s)` (bom), mas o use case
retorna `void` idêntico para email existente e inexistente — correto contra
enumeração. **Porém**, o envio real de email (quando existe) permite medir tempo
de resposta para enumerar. Baixo risco com throttle, mas é bom ter resposta
uniforme (delay sintético quando não existe).

### 🟡 MÉDIO

#### 2.6 [A02] Política de senha fraca
**Arquivo:** `src/modules/users/domain/value-objects/password.vo.ts`

`Password.create` exige apenas `>= 8` caracteres. Sem requisito de complexidade
(maíuscula, número, símbolo). O OWASP ASVS recomenda 12+ ou 8+ com complexidade.

**Correção:** subir para 12, ou 8 com regra de ao menos uma letra e um número.

#### 2.7 [A05] Rate limit com storage em memória
**Arquivo:** `src/infrastructure/rate-limit/rate-limit.module.ts`

Throttler usa storage em memória. Em deploy com múltiplas instâncias, o limite
é por-instância (bypassável distribuindo as requisições). Documentado no código,
mas é dívida técnica para produção.

**Correção:** `@nestjs/throttler-storage-redis` (já temos Redis).

#### 2.8 [A09] Zero auditoria (AuditLog existe mas não é gravado)
**Arquivos:** todo o módulo; `AuditLog` no schema mas sem escrita

O schema tem `AuditLog` e o doc-sistema exige auditoria (RF34, RB28: login,
status_change, role_change, operações administrativas). **Nenhum use case grava
auditoria.** Operações sensíveis (block, change role, login) não são rastreadas.

**Correção:** criar um `AuditLoggerPort` e chamá-lo nos use cases de admin e no
login. (Prioridade: documentar como fase futura.)

### 🟢 BAIXO

#### 2.9 [A01] `update-user-role` não valida contra enum de roles
**Arquivo:** `update-user-role.use-case.ts`

`roleName` é string livre validada só pelo `findByName`. Se a role existe no
banco, passa. Aceitável, mas não impede passar role arbitrária que exista no
banco. Baixo risco (só SUPER_ADMIN tem acesso).

#### 2.10 Listagens sem paginação explícita de segurança
`list-users` tem paginação (bom). Não há cap hardcoded além do Zod `max(100)`.

---

## 3. Análise de Verbosidade

### 3.1 Pontos positivos
- DTOs Zod enxutos (um campo por arquivo, mas objetivos).
- Value objects (`Email`, `Password`) curtos e claros.
- Mappers separados e legíveis.

### 3.2 Oportunidades de redução

| # | Local | Problema | Sugestão |
|---|-------|----------|----------|
| V1 | `user.entity.ts` | 11 getters manuais com `_` prefixado | Idiomático em DDD, mas poderia usar `Object.freeze` + `readonly` em vez de `_field` + getter. Manter como está é aceitável. |
| V2 | `list-users.use-case.ts` | Use case é um pass-through trivial (só delega ao repositório) | Aceitável por consistência de camada, mas sinaliza que `ListUsers` é CRUD puro sem regra de negócio. |
| V3 | `auth.service.ts` | Erros `InvalidCredentialsError`/`InvalidRefreshTokenError` definidos **inline** no service | Mover para `errors.ts` do módulo auth (consistência com `users/application/errors.ts`). |
| V4 | `import type` duplicado | Padrão "import valor + import type" em quase todo arquivo | Necessário por `isolatedModules` + `emitDecoratorMetadata`. Não é verbosidade removível sem perder o build. |
| V5 | `prisma-user.repository.ts` | `save()` usa upsert com `update` explícito lista 8 campos | Poderia usar `update: data` inteiro (idempotente). Levemente mais enxuto. |
| V6 | DTOs de admin | 3 arquivos de schema para status/role (1 campo cada) | Aceitável; agrupar em um `admin.schema.ts` reduziria arquivos. |

**Conclusão de verbosidade:** bem controlada. As maiores oportunidades (V3, V5)
são cosméticas.

---

## 4. Análise de Violações de DIP

### 4.1 Estado geral
O princípio da inversão de dependência está **bem aplicado**: repositórios são
portas (`UserRepositoryPort`, `RoleRepositoryPort`, `UserAccessPort`), serviços
dependem de interfaces injetadas por `@Inject(TOKEN)`, infraestrutura é plugável
(Prisma, bcrypt, JWT, Redis atrás de portas).

### 4.2 Violações e acoplamentos encontrados

| # | Severidade | Local | Descrição |
|---|-----------|-------|-----------|
| D1 | 🟠 | `auth.service.ts:121` | **Lê `process.env.JWT_REFRESH_TTL` diretamente.** A aplicação depende de uma implementação concreta (process.env) em vez de config injetada. Quebra o DIP e dificulta teste/portabilidade. |
| D2 | 🟡 | `roles.guard.ts` (em `common/`) | O guard em `common/` importa `USER_ACCESS_PORT` de `modules/users/domain`. **`common` depende de um módulo específico** — inversão de camada. `common` deveria ser agnóstico; o acoplamento deveria ser invertido (guard no módulo que o usa, ou a porta em `common/ports`). |
| D3 | 🟡 | `jwt.strategy.ts` (auth) injeta `USER_ACCESS_PORT` (users) | Cross-module via porta — aceitável, mas cria dependência `auth → users`. Funciona, porém há acoplamento entre módulos que poderia ser resolvido com uma porta própria do auth. |
| D4 | 🟢 | `UserMapper.toDomain` chama `Email.create` que pode lançar | Carregar dado do banco e re-validar email é correto, mas o `InvalidEmailError` pode estourar em runtime se o banco tiver dado legado inválido. Aceitável. |
| D5 | 🟢 | `ZodValidationPipe` instanciado com `new` nos decorators | Padrão Nest legítimo, não é violação (pipe não precisa de DI). |

### 4.3 Detalhe do D1 (o mais importante)

```ts
// auth.service.ts — issueTokens
await this.refreshStore.save(
  refresh.jti,
  sub,
  Number(process.env.JWT_REFRESH_TTL ?? 604800),  // ← cheiro de DIP
)
```

O TTL deveria vir de um `ConfigService` (ou de uma porta `TokenConfigPort`),
como já acontece no `JwtTokenService` (que usa `config.getOrThrow`). Duplicação
de fonte de verdade para o mesmo TTL.

**Correção:** injetar `ConfigService` no `AuthService` e usar
`config.getOrThrow<number>('JWT_REFRESH_TTL')`.

---

## 5. Tabela consolidada de achados

| ID | Eixo | Severidade | Achado | Ação |
|----|------|-----------|--------|------|
| 2.1 | OWASP | 🔴 | Login não rejeita usuário BLOCKED | Corrigir login + refresh |
| 2.2 | OWASP | 🔴 | Verificação de email nunca envia/genera token | Completar fluxo no register |
| 2.3 | OWASP | 🔴 | verify-email não vincula token→email | Usar userId do token |
| 2.4 | OWASP | 🟠 | verify() mistura access/refresh secret | Separar verifyAccess/verifyRefresh |
| 2.5 | OWASP | 🟠 | forgot-password sem resposta uniforme | Delay sintético |
| 2.6 | OWASP | 🟡 | Senha só exige 8 chars | Complexidade ou 12+ |
| 2.7 | OWASP | 🟡 | Rate limit em memória | Redis storage |
| 2.8 | OWASP | 🟡 | Sem auditoria (AuditLog órfão) | AuditLoggerPort |
| 2.9 | OWASP | 🟢 | role livre em update-user-role | Validar enum |
| D1 | DIP | 🟠 | process.env direto no AuthService | Injetar ConfigService |
| D2 | DIP | 🟡 | common/ → modules/users/ (inversão de camada) | Mover guard/porta |
| D3 | DIP | 🟡 | auth → users (cross-module) | Porta própria ou aceitar |
| V3 | Verbosidade | 🟢 | Erros de auth inline no service | Mover para errors.ts |
| V5 | Verbosidade | 🟢 | save() com update explícito verboso | update: data |

---

## 6. Plano de ação sugerido (ordem de prioridade)

1. **Corrigir 2.1** (login rejeita BLOCKED) — segurança crítica, 10 min.
2. **Corrigir 2.3** (verify-email usa userId) — segurança crítica, 10 min.
3. **Completar 2.2** (register envia email de verificação) — funcionalidade quebrada.
4. **Corrigir 2.4** (separar verifyAccess/verifyRefresh) — higiene de segurança.
5. **Corrigir D1** (process.env → ConfigService) — DIP.
6. **2.6, 2.7, 2.8, 2.9, D2, D3, V3, V5** — melhorias incrementais, podem virar issues.

---

## 7. Conclusão

O módulo tem **fundações sólidas** (DDD, DIP na maior parte, testes, RBAC). As
falhas concentram-se em **segurança de autenticação/autorização** (login de
bloqueado, verificação de email quebrada) — surpreendente dado o esforço em RBAC.
A verbosidade é baixa e o DIP tem um único ponto relevante (`process.env` no
AuthService).

**Recomendação:** corrigir os 3 críticos (2.1, 2.2, 2.3) antes de avançar para
novas funcionalidades.

---

## 8. Status das correções (aplicado em 2026-08-26)

| ID | Achado | Status |
|----|--------|--------|
| 2.1 | Login/refresh rejeita BLOCKED | ✅ Corrigido (+2 testes) |
| 2.2 | Register envia email de verificação | ✅ Corrigido (+1 teste) |
| 2.3 | verify-email usa userId do token | ✅ Corrigido (+1 teste, DTO simplificado) |
| D1 | process.env → ConfigService | ✅ Corrigido |
| 2.4 | separar verifyAccess/verifyRefresh | ✅ Corrigido (porta + AuthService + testes) |
| 2.6 | política de senha | ✅ Corrigido (letra+número, +2 testes) |
| 2.7 | rate limit Redis | ✅ Corrigido (storage Redis + flush no e2e) |
| 2.9 | validar role enum | ✅ Corrigido (Zod enum, +1 teste e2e) |
| V3 | erros de auth inline | ✅ Corrigido (migrado para `auth/errors.ts`) |
| 2.8 | auditoria (AuditLog) | ✅ Parcial (AuditLoggerPort + status_change/role_change) |
| 2.5 | forgot-password resposta uniforme | ✅ Corrigido (delay sintético 500ms) |
| D2 | common/ → modules/ (inversão de camada) | ✅ Corrigido (`UserAccessPort` movida para `common/ports`) |
| D3 | auth → users cross-module | ✅ Aceito por design (UserRepositoryPort é do domínio users; dependência auth→users é natural via porta) |
| V5 | save() update explícito | ✅ Corrigido (`update: data`) |
