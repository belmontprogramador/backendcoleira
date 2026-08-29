# PLANO: MÓDULO DE PETS (NestJS + Prisma)

> Alinhado ao `skiils/doc-sistema` (modelo de dados, apis, privacidade, Premium).
> **Fase 2** do `doc/plano-implementacao.md`.

## CONTEXTO

O módulo de Pets é o **primeiro recurso de domínio** depois da identidade.
Um `Pet` pertence a um `User` (ownership) e será o alvo do pingente NFC/QR
(Fase 3) e do perfil público (Fase 5).

**Escopo desta fase (Basic):** Pet + PetPrivacy + modo perdido + upload de foto.

**Fora desta fase (Premium — Fase 7):** PetMedical, PetContact. As relações
dessas models no schema ficam **comentadas** até a fase dona, conforme a regra
cross-phase já consolidada na Fase 1.

---

## 1. MODELO DE DADOS (fonte: doc-sistema §2, §4)

```text
Pet
---
id
owner_id
name
species
breed
sex
birth_date
photo_url
description
city
lost_status
created_at
updated_at
deleted_at      # soft delete
```

```text
PetPrivacy
----------
pet_id
show_phone
show_email
show_city
show_medical
show_veterinarian
show_behavior
show_contacts
```

- `PetSex` é um enum do Prisma (`MALE`, `FEMALE`, `UNKNOWN`).
- **NÃO existe** um "status" de pet no doc-sistema — só `lost_status: Boolean`.
  Não criar value object `PetStatus`.
- **`city` foi adicionado ao Pet** (não estava no modelo-de-dados, mas aparece
  como feature do Basic — "cidade/região" — e no perfil público/edição).
- **NÃO existe** a regra "tutor não pode ter 2 pets com o mesmo nome" no
  doc-sistema. **Não** criar `@@unique([owner_id, name])` — pets homônimos são
  permitidos.

---

## 2. SCHEMA PRISMA

```prisma
model Pet {
  id          String    @id @default(cuid())
  owner_id    String
  name        String
  species     String
  breed       String?
  sex         PetSex?
  birth_date  DateTime?
  photo_url   String?
  description String?
  city        String?
  lost_status Boolean   @default(false)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  deleted_at  DateTime?

  owner       User      @relation(fields: [owner_id], references: [id], onDelete: Restrict)
  privacy     PetPrivacy?

  // Relações cross-phase — COMENTADAS até a fase dona:
  // nfc_tags      NfcTag[]         // Fase 3
  // medical       PetMedical?      // Fase 7 (Premium)
  // contacts      PetContact[]     // Fase 7 (Premium)
  // access_events AccessEvent[]    // Fase 6

  @@index([owner_id])
  @@index([deleted_at])
  @@map("pets")
}

model PetPrivacy {
  id                 String   @id @default(cuid())
  pet_id             String   @unique
  show_phone         Boolean  @default(true)
  show_email         Boolean  @default(false)
  show_city          Boolean  @default(true)
  show_medical       Boolean  @default(false)
  show_veterinarian  Boolean  @default(false)
  show_behavior      Boolean  @default(false)
  show_contacts      Boolean  @default(false)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  pet                Pet      @relation(fields: [pet_id], references: [id], onDelete: Cascade)

  @@map("pet_privacy")
}

enum PetSex {
  MALE
  FEMALE
  UNKNOWN
}
```

**Regras críticas (Prisma 7):**
- Referential actions em **PascalCase** (`Cascade`, `Restrict`). Uppercase inválido.
- `onDelete: Restrict` no `owner` (User) — não permitir apagar User com pets.
- `PetPrivacy` é criado junto com o Pet (relação 1:1). `onDelete: Cascade` é
  correto aqui porque a privacidade é parte do agregado Pet.
- Descomentar `nfc_tags`/`medical`/`contacts`/`access_events` **somente** na fase dona.

---

## 3. ESTRUTURA DO MÓDULO (4 camadas, DDD)

```
src/modules/pets/
├── domain/
│   ├── entities/
│   │   ├── pet.entity.ts
│   │   └── pet-privacy.entity.ts
│   ├── value-objects/
│   │   ├── pet-species.vo.ts
│   │   └── pet-sex.vo.ts
│   ├── repositories/
│   │   ├── pet.repository.port.ts
│   │   └── pet-privacy.repository.port.ts
│   └── __tests__/
│       └── pet.entity.spec.ts
│
├── application/
│   ├── use-cases/
│   │   ├── create-pet.use-case.ts
│   │   ├── get-pet.use-case.ts
│   │   ├── list-user-pets.use-case.ts
│   │   ├── update-pet.use-case.ts
│   │   ├── delete-pet.use-case.ts
│   │   ├── set-lost-status.use-case.ts
│   │   ├── update-privacy.use-case.ts
│   │   └── upload-photo.use-case.ts
│   ├── dtos/
│   │   ├── create-pet.schema.ts
│   │   ├── update-pet.schema.ts
│   │   ├── lost-status.schema.ts
│   │   ├── privacy.schema.ts
│   │   └── pet-response.mapper.ts
│   ├── errors.ts
│   └── __tests__/
│
├── infrastructure/
│   ├── repositories/
│   │   ├── prisma-pet.repository.ts
│   │   └── prisma-pet-privacy.repository.ts
│   ├── mappers/
│   │   └── pet.mapper.ts
│   ├── storage/
│   │   ├── pet-storage.port.ts        # porta (abstração)
│   │   ├── local-pet-storage.service.ts   # mock local (dev)
│   │   └── s3-pet-storage.service.ts      # produção (S3/R2)
│   └── __tests__/
│
├── presentation/
│   ├── controllers/
│   │   ├── pets.controller.ts         # /pets (usuário)
│   │   └── admin-pets.controller.ts   # /admin/pets
│   └── __tests__/
│
└── pets.module.ts
```

**Regras de organização (consolidadas):**
- **Sem** `pets.service.ts` nem `pets.repository.ts` soltos na raiz — regra de
  negócio vive no domínio/aplicação, persistência vive na infraestrutura.
- **DTOs únicos** em `application/dtos/` com schema Zod — **não** duplicar em
  `presentation/dtos/`.
- **Zod para validação** (NUNCA `class-validator`/`class-transformer`).
- Testes em `__tests__/` co-localizada. E2E em `test/` na raiz.

---

## 4. VALIDAÇÃO (Zod)

```ts
// create-pet.schema.ts
import { z } from 'zod'

export const createPetSchema = z.object({
  name: z.string().min(1).max(50),
  species: z.string().min(1).max(30),
  breed: z.string().max(30).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
  birthDate: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
})

export const updatePetSchema = createPetSchema.partial()

export const lostStatusSchema = z.object({
  lost: z.boolean(),
})

export const privacySchema = z.object({
  showPhone: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showCity: z.boolean().optional(),
  showMedical: z.boolean().optional(),
  showVeterinarian: z.boolean().optional(),
  showBehavior: z.boolean().optional(),
  showContacts: z.boolean().optional(),
})
```

---

## 5. ENDPOINTS

### 5.1 Usuário comum (autenticado) — doc-sistema apis §3

```http
GET    /pets                     # listar meus pets
POST   /pets                     # criar pet (cria PetPrivacy junto)
GET    /pets/:id                 # detalhar (só meu)
PATCH  /pets/:id                 # atualizar (só meu)
DELETE /pets/:id                 # soft delete (só meu)

POST   /pets/:id/lost            # marcar como perdido
POST   /pets/:id/found           # marcar como encontrado

GET    /pets/:id/privacy         # ver privacidade (só meu)
PATCH  /pets/:id/privacy         # atualizar privacidade (só meu)

POST   /pets/:id/photo           # upload de foto
DELETE /pets/:id/photo           # remover foto
```

### 5.2 Admin — doc-sistema apis §6

```http
GET    /admin/pets               # listar todos (com filtros/paginação)
GET    /admin/pets/:id           # detalhar qualquer pet
```

> ⚠️ **NÃO** criar `DELETE /admin/pets/:id` como **hard delete**. O doc-sistema §43
> manda usar soft delete sempre. Se houver necessidade de moderação, é soft delete
> também (ou um endpoint futuro dedicado), nunca destruir registro.

---

## 6. OWNERSHIP E SEGURANÇA (IDOR)

A regra de ownership **vive no use case**, não num guard acoplado a service.

```ts
// get-pet.use-case.ts (padrão replicado em update/delete/lost/privacy)
async execute(actorId: string, petId: string) {
  const pet = await this.pets.findById(petId)
  if (!pet) throw new PetNotFoundError(petId)
  if (pet.ownerId !== actorId) throw new PetOwnerMismatchError()
  return pet
}
```

- O `actorId` vem do `@CurrentUser()` (mesmo padrão da Fase 1).
- Use cases recebem a porta `PetRepositoryPort` via `@Inject(PET_REPOSITORY_PORT)`
  (interface apaga no runtime — `@Injectable()` + `@Inject` obrigatórios).
- Erros customizados em `application/errors.ts`:
  - `PetNotFoundError` → 404
  - `PetOwnerMismatchError` → 403
  - `DuplicatePetError` → 409 (caso alguma restrição futura exija)
- Registrar auditoria (`AuditLoggerPort`) em: criação, alteração de privacidade,
  modo perdido, soft delete.

---

## 7. UPLOAD DE FOTO (porta plugável)

O storage é **efeito colateral** → mock é legítimo (diferente de dados de domínio).

```ts
// infrastructure/storage/pet-storage.port.ts
export const PET_STORAGE_PORT = Symbol('PET_STORAGE_PORT')
export interface PetStoragePort {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>
  remove(key: string): Promise<void>
}
```

- **`LocalPetStorageService`** (dev): grava em `./uploads/pets/{petId}/` e retorna
  URL local. É o mock que usamos agora.
- **`S3PetStorageService`** (produção): `@aws-sdk/client-s3` + `sharp` para
  resize (800×800, quality 80) e validação (jpeg/png/webp, máx 5MB).
- O use case `upload-photo.use-case.ts` depende **só** de `PetStoragePort` — trocar
  mock por S3 é plugar outra classe, sem tocar no domínio.

---

## 8. TASKS DETALHADAS

### Tarefa 2.1 — Schema Prisma
```text
□ Modelos Pet + PetPrivacy + enum PetSex
□ Relações cross-phase comentadas (nfc_tags, medical, contacts, access_events)
□ Descomentar relação `pets` no model User (nasce aqui)
□ Migration + prisma generate
□ Seed com pets de exemplo
```

### Tarefa 2.2 — Domain Layer (TDD)
```text
□ Entidade Pet (agregado) + PetPrivacy
□ Value objects PetSpecies, PetSex
□ Portas PetRepositoryPort, PetPrivacyRepositoryPort
□ Erros de domínio
```

### Tarefa 2.3 — Infrastructure Layer (TDD)
```text
□ PrismaPetRepository + PrismaPetPrivacyRepository + mappers
□ PetStoragePort + LocalPetStorageService (mock) + S3PetStorageService
□ Configurar upload (multer, limite 5MB)
```

### Tarefa 2.4 — Application Layer (TDD)
```text
□ Use cases: CreatePet, GetPet, ListUserPets, UpdatePet, DeletePet,
  SetLostStatus, UpdatePrivacy, UploadPhoto
□ Schemas Zod + response mapper
□ Auditoria nos eventos sensíveis
```

### Tarefa 2.5 — Presentation Layer (TDD)
```text
□ PetsController (/pets) + AdminPetsController (/admin/pets)
□ @CurrentUser() + permissões (pet:read, pet:write, pet:delete)
□ Filtro de exceção para PetNotFoundError/PetOwnerMismatchError
```

### Tarefa 2.6 — Testes (TDD)
```text
□ Unitários (entidade, VOs, use cases)
□ Integração (repositories + banco real)
□ E2E (CRUD, ownership/IDOR, lost/found, privacidade)
```

---

## 9. CRITÉRIOS DE ACEITE

1. Usuário cria pet com nome, espécie, raça, sexo, nascimento, descrição.
2. Usuário só vê/edita/apaga **seus** pets (IDOR protegido → 403).
3. `PATCH /pets/:id` de pet alheio → 403; `GET /pets/:id` de pet alheio → 403.
4. Modo perdido (`lost/found`) altera `lost_status`.
5. Privacidade (7 flags) é lida/atualizada pelo dono.
6. Upload de foto valida tipo/tamanho e (em produção) redimensiona/compime.
7. Soft delete marca `deleted_at`; listagem omite deletados.
8. Admin lista/visualiza todos os pets (sem hard delete).
9. PetMedical/PetContact **não** existem nesta fase (relações comentadas).

---

## 10. DEPENDÊNCIAS A INSTALAR

```bash
# Storage (produção) + processamento de imagem
npm install @aws-sdk/client-s3 sharp

# Upload
npm install @nestjs/platform-express multer
npm install -D @types/multer
```

> `zod` e `@nestjs/cache-manager` já estão instalados (Fase 1).
> **Não** instalar `class-validator`/`class-transformer` (proibido — usar Zod).
