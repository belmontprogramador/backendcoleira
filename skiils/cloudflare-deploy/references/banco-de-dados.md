# Banco de dados na Cloudflare

## Escolha

| Cenário | Produto | Prisma adapter |
|---|---|---|
| Manter o Postgres atual (RDS/Supabase/self-host) | **Hyperdrive** (pool + cache) | `@prisma/adapter-pg-worker` |
| Postgres serverless nativo | **Neon** | `@prisma/adapter-neon` (HTTP, sem TCP) |
| Migrar para SQLite (perde features Postgres) | **D1** | `@prisma/adapter-d1` |

> Para o `coleira-cachorro` (schema com enums, `cuid()`, JSON), **Hyperdrive ou Neon** mantêm o schema Postgres intacto — zero mudança de schema. **D1** exigiria converter o schema para SQLite e repensar enums/tipos.

## Hyperdrive

Proxy de conexão que dá ao Worker um `connectionString` de Postgres (pooling + query caching globais). Funciona com o driver `pg` + `nodejs_compat`.

```bash
wrangler hyperdrive create my-db --connection-string="postgres://user:pass@host:5432/db"
```

```jsonc
// wrangler.jsonc
{
  "compatibility_flags": ["nodejs_compat"],
  "hyperdrive": [
    { "binding": "DB", "id": "<HYPERDRIVE_ID>",
      "localConnectionString": "postgres://user:pass@localhost:5432/db" }
  ]
}
```

Prisma via Hyperdrive:

```ts
import { PrismaPg } from "@prisma/adapter-pg-worker";
// PrismaPg aceita a connectionString exposta pelo Hyperdrive
const adapter = new PrismaPg({ connectionString: env.DB.connectionString });
const prisma = new PrismaClient({ adapter });
```

> Verificar a assinatura exata do construtor do `@prisma/adapter-pg-worker` na versão instalada; o ponto-chave é que ele **não abre socket TCP real** (rota pelo Hyperdrive).

## Neon (serverless Postgres)

- `DATABASE_URL` pooled (para o client) + `DIRECT_URL` (para o CLI/migrate).
- Cold start ~500ms–poucos segundos; ajustar `connect_timeout=15&pool_timeout=15` se houver timeout.

```bash
npm i @prisma/adapter-neon
```

```ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

`prisma.config.ts` aponta para o `DIRECT_URL` (CLI); o client usa o pooled (com `-pooler` no host).

## D1 (SQLite)

Só se aceitar migrar de Postgres→SQLite. `@prisma/adapter-d1` + schema `sqlite`.

```bash
wrangler d1 create my-db
wrangler d1 migrations apply my-db
```

```ts
import { PrismaD1 } from "@prisma/adapter-d1";
const adapter = new PrismaD1(env.DB);
```

## Migrations no deploy

- Prisma 7 (nosso caso): CLI usa `prisma.config.ts` + `DIRECT_URL` (Hyperdrive/Neon direto); `prisma migrate deploy` roda como etapa de CI **fora** do Worker (o Worker não roda migrations).
- `prisma generate` roda no build (gera o client TS puro).

## Considerações de conexão serverless

- Workers criam/descartam instâncias; criar o client **por request** ou singleton no escopo do módulo (o adapter não mantém pool TCP real).
- Hyperdrive faz o pooling; Neon faz pooling via PgBouncer (`-pooler` no host).
- `DATABASE_URL` deve ser **secret** (`wrangler secret put`), não `vars`.
