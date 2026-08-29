---
name: cloudflare-deploy
description: "Deploy do backend (NestJS) e banco de dados (PostgreSQL) na Cloudflare — Workers, Pages, Hyperdrive, D1, R2, KV/Upstash e Prisma driver adapters."
---

# Deploy na Cloudflare (Workers + Pages)

Como levar o projeto `coleira-cachorro` (backend NestJS + Prisma/Postgres + Redis, frontend Next.js) para a Cloudflare. Cobre a plataforma (Workers vs Pages vs Pages Functions), o runtime, o banco (Hyperdrive/Neon/D1), cache (KV/Upstash), storage (R2) e o passo-a-passo de deploy.

## ⚠️ Realidade crítica (ler antes de tudo)

**NestJS NÃO roda em Cloudflare Workers.** Workers (e Pages Functions) usam o runtime `workerd` (isolados V8) com o modelo de `fetch` handler — não há servidor Node.js ouvindo em socket TCP. `@nestjs/platform-express`/Fastify chamam `app.listen()`, que exige um listener TCP de entrada, que **não existe** em Workers.

Consequência direta para este projeto:

- **Backend NestJS** → ou fica numa plataforma Node (Railway/Render/Fly/VPS/Container), ou a camada de **presentation** é reescrita para Hono (ou Pages Functions), preservando as camadas **domain/application** (TypeScript puro e agnósticas de framework — nosso DDD já facilita isso).
- **Frontend Next.js** → deploy **nativo** via `vinext` (recomendado) ou OpenNext.
- **Postgres** → via **Hyperdrive** (mantém o Postgres atual) ou **Neon** (serverless), trocando o driver adapter do Prisma.
- **Redis** → **Upstash Redis** (REST) ou **KV**. O `ioredis`/`redis` (TCP) e o throttler storage baseado em Redis precisam ser trocados.

## Quando usar

- Planejando/executando deploy do backend, banco ou frontend na Cloudflare
- Decidindo entre Workers, Pages e Pages Functions
- Migrando Prisma/Postgres/Redis para rodar no runtime de Workers
- Configurando bindings, secrets, Hyperdrive, D1, R2, KV no `wrangler`
- Escrevendo CI/CD de deploy (GitHub Actions + wrangler)

## Fluxo

1. Leia `references/plataforma.md` para entender Workers vs Pages vs Functions e o runtime (fetch handler, Node.js compat, bindings).
2. Frontend → `references/frontend-nextjs.md`.
3. Backend → `references/backend-nestjs.md` (realidade + caminhos de migração).
4. Banco → `references/banco-de-dados.md` (Hyperdrive/Neon/D1 + Prisma adapters + migrations).
5. Cache/sessão → `references/cache-e-redis.md` (Upstash/KV + throttler + R2).
6. Config/deploy/CI → `references/comandos-e-config.md` (wrangler, secrets, deploy, GitHub Actions).

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [plataforma.md](references/plataforma.md) | Workers vs Pages vs Pages Functions, runtime (fetch handler), Node.js compat, bindings, compat date/flags |
| [frontend-nextjs.md](references/frontend-nextjs.md) | Next.js via vinext (recomendado), OpenNext, static export no Pages |
| [backend-nestjs.md](references/backend-nestjs.md) | Por que NestJS não roda; caminhos (Hono rewrite, Pages Functions, manter em Node); migração por camadas + cheatsheet |
| [banco-de-dados.md](references/banco-de-dados.md) | Hyperdrive, Neon, D1; Prisma driver adapters (pg-worker, neon, d1); migrations |
| [cache-e-redis.md](references/cache-e-redis.md) | Upstash Redis, KV, R2, Queues; migração do ioredis e do throttler |
| [comandos-e-config.md](references/comandos-e-config.md) | wrangler config (JSONC/TOML), secrets, bindings, deploy, GitHub Actions |
