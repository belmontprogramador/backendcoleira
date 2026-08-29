📋 PLANO DE IMPLEMENTAÇÃO — FASE 5: PERFIL PÚBLICO

🎯 OBJETIVO GERAL
Implementar o perfil público do pet — a interface principal do produto, acessada
via NFC/QR por qualquer pessoa (sem login) que encontrar um pet perdido.

⚠️ ADERÊNCIA AO DOC-SISTEMA (verificado antes de iniciar)
Este plano foi reescrito para remover dependências de fases futuras que
apareciam na versão original. O escopo abaixo é o que a Fase 5 DEVE entregar.

┌─────────────────────────────────────────────────────────────────────────────┐
│  FORA DO ESCOPO DA FASE 5 (movido para fases futuras)                        │
│  • Diferenciação Basic vs Premium → FASE 7 (Feature System não existe)       │
│  • PetMedical / PetContact              → FASE 7 (modelos comentados)        │
│  • AccessEvent (registro de acessos)    → FASE 6 (contato/localização)       │
│  • Contact / Location (enviar msg, GPS) → FASE 6                             │
│  • Fila assíncrona (Bull)               → FASE 10                            │
│  • Geolocation por IP / device detection → opcional, NÃO implementar agora   │
└─────────────────────────────────────────────────────────────────────────────┘

📦 ESCOPO DO MÓDULO (o que será entregue)
1. Endpoint público `GET /p/:publicId` — rota amigável do NFC/QR.
2. Resposta condicional conforme privacidade (`show_*`).
3. Pingente virgem → resposta "não ativado" (sem expor dados).
4. Pet perdido → alerta destacado.
5. Cache Redis (reuso do `CachePort`/`RedisService` existente — SEM lib nova).
6. NUNCA expor dados administrativos (senha, email administrativo, tokens, etc.).

🗄️ MODELOS DE DADOS (NENHUM novo)
Reuso integral dos modelos já existentes:
- `NfcTag`  (public_id, status, owner_id, pet_id)         → Fase 3/4
- `Pet`     (nome, espécie, raça, foto, cidade, perdido)  → Fase 2
- `PetPrivacy` (show_phone, show_email, show_city, ...)   → Fase 2
- `User`    (name, phone, email do tutor)                 → Fase 1

Nenhuma migration nesta fase. `PetMedical`/`PetContact` continuam comentados.

🎯 VALUE OBJECT (DOMÍNIO)
`PublicProfile` (imutável)
- `PublicProfile.active(pet, owner)` — monta o perfil do pet aplicando privacidade.
- `PublicProfile.unactivated(status)` — pingente sem pet ativo ("não ativado").

Regras de privacidade (doc-sistema §3 — "Feature + autorização → retorna"):
- `show_phone = false`  → `owner.phone` = null (não retorna)
- `show_email = false`  → `owner.email` = null (não retorna)
- `show_city  = false`  → `pet.city`    = null (não retorna)
- `owner.name` sempre visível (contato básico — não há flag `show_name`).
- Campos Basic do pet (name, species, breed, sex, photo, description, lost_status)
  sempre visíveis.

🔧 USE CASES (APLICAÇÃO)
`GetPublicProfileUseCase`
- Entrada: `publicId` (string).
- Fluxo:
  1. `NfcTagRepositoryPort.findByPublicId(publicId)` — se null → `TagNotFoundError` (404).
  2. Se `tag.petId` vazio OU pet deletado → `PublicProfile.unactivated(tag.status)`.
  3. Busca pet (`PetRepositoryPort.findById`) + owner (`UserRepositoryPort.findById`).
  4. Retorna `PublicProfile.active(pet, owner)`.
- Cache: `CACHE_PORT` (Redis), chave `profile:{publicId}`, TTL 300s (ou 60s se
  `lost_status = true`). Cache hit devolve direto; miss popula o cache.
- Invalidação: os use cases de pets (update/privacidade/lost/foto) e ownership
  (activate/transfer/unlink/replace) passam a invalidar `profile:{publicId}`
  quando alteram dados expostos publicamente (ver 5.3).

Exceções (REUSAR — não duplicar classes):
- `TagNotFoundError` (nfc/application/errors)        → 404
- `PetNotFoundError`  (pets/application/errors)      → 404
- `UserNotFoundError` (users/application/errors)     → 404

🔐 SEGURANÇA
- Rota pública (`@Public()`), sem autenticação (RB08).
- Rate limiting já global no app (Throttler).
- Public ID não é credencial nem sequencial (gerado na Fase 3).
- Nunca expor: `activation_code_hash`, `password_hash`, `email` administrativo,
  `uid`, tokens, dados de assinatura.
- Sem enumeração: 404 genérico para ID inexistente.

🚀 ENDPOINTS (somente 1 nesta fase)
| Método | Endpoint           | Descrição                    | Auth |
|--------|--------------------|------------------------------|------|
| GET    | `/p/:publicId`     | Perfil público do pet        | Não  |

> O doc-sistema `apis.md §4` listava `GET /public/pets/:publicId`, mas
> `produto-identidade.md`/`ativacao.md` usam `/p/{publicId}` e a Fase 3 JÁ gravou
> `/p/{publicId}` no NFC/QR. Decisão: **manter `/p/:publicId`** (corrigir apis.md).

📊 ESTRUTURA DE RESPOSTA
Pet ativo (com privacidade aplicada):
```json
{
  "status": "ACTIVE",
  "pet": {
    "name": "Thor",
    "species": "Cão",
    "breed": "Shih Tzu",
    "sex": "MALE",
    "photo_url": "https://storage.com/pets/thor.jpg",
    "description": "Muito carinhoso",
    "city": "Araruama - RJ",
    "lost_status": true
  },
  "owner": {
    "name": "João Silva",
    "phone": "(21) 99999-9999",
    "email": null
  },
  "message": null
}
```
Pingente virgem:
```json
{
  "status": "AVAILABLE",
  "pet": null,
  "owner": null,
  "message": "Este pingente ainda não foi ativado"
}
```
> `alert` (pet perdido) é derivado do `lost_status` pelo front; o backend só
> garante `lost_status` na resposta (mantém o contrato mínimo).

📋 SUB-FASES (TDD — teste → implementação → pausa)
| Sub-fase | Entrega | Camada |
|----------|---------|--------|
| 5.1 | ✅ `PublicProfile` VO + testes unitários | domain |
| 5.2 | ✅ `GetPublicProfileUseCase` + erros + testes | application |
| 5.3 | ✅ Cache Redis + invalidação nos updates + testes | infra/app |
| 5.4 | ✅ `PublicProfileController` + módulo + filtro | presentation |
| 5.5 | ✅ E2E + Postman + MEMORY + plano-implementacao | — |

⚠️ ARMADILHAS DOCUMENTADAS (histórico de bugs — NÃO repetir)
1. **Erros não duplicar entre módulos**: reusar `TagNotFoundError`/`PetNotFoundError`/
   `UserNotFoundError`. Classes com mesmo `name` em módulos diferentes quebram o
   `AuthExceptionFilter` (@Catch por classe) → 500 silencioso.
2. **`import type` em parâmetros decorados**: com `isolatedModules` +
   `emitDecoratorMetadata`, tipos em `@Inject`/`@Body`/`@Param` precisam vir de
   `import type` separado (TS1272).
3. **Construtor com default em `@Injectable()`**: proibido — Nest tenta injetar
   e `app.init()` trava para sempre. Configs fixas viram constante fora da classe.
4. **Zod, NUNCA class-validator.**
5. **Reuso do Redis existente** (`CACHE_PORT`/`RedisService`). NÃO adicionar
   `@nestjs/cache-manager`/`cache-manager-redis-yet`.
6. **`nanoid` é ESM** — se adicionar lib ESM nova, registrar no
   `transformIgnorePatterns` de `jest.config.js` E `test/jest-e2e.json`.
7. **Rota pública**: `@Public()` obrigatório, senão o `JwtAuthGuard` global barra
   com 401.
8. **Enum comparison**: usar `TagStatus.ACTIVE`, nunca literal `'ACTIVE'`
   (lint `no-unsafe-enum-comparison`).
9. **Build limpo**: apagar `tsconfig.build.tsbuildinfo` + `dist/` antes do
   `start:prod` (tsc incremental deixa `dist/` incompleto).
