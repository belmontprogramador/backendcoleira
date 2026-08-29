# Backend NestJS na Cloudflare (a parte difícil)

## TL;DR

**Não dá para rodar NestJS (Express/Fastify) em Workers.** O runtime não suporta `listen()`/socket de entrada. Três caminhos:

| Caminho | Esforço | Quando |
|---|---|---|
| A. Manter NestJS em plataforma Node (Railway/Render/Fly/VPS/Container) | 0 (nenhum código) | Precisa ir pra produção já, sem reescrever |
| B. Reescrever só a camada presentation em **Hono**, mantendo domain/application | médio | Quer o backend de fato na Cloudflare |
| C. Pages Functions (rota a rota) | médio-alto | Front já em Pages e poucas rotas |

## Por que não roda (detalhe)

- NestJS inicia via `NestFactory.create(AppModule)` → `app.listen(port)`, que cria um `http.Server` do Node ligado a um socket TCP.
- Workers só expõem o handler `fetch(request, env, ctx)` — não há socket de entrada.
- A "Node.js compatibility" cobre `http`/`net` **de saída** (clientes, drivers), não servidor.

## Caminho B (recomendado para Cloudflare) — Hono + manter DDD

Nosso projeto já separa as 4 camadas. Só a **presentation** (controllers/guards/pipes do Nest) depende do Nest. Domain, application (use cases), ports e infra (repos/adapters) são TypeScript puro e reusáveis.

Passos:

1. **Trocar a presentation.** Criar um entry `src/index.ts` do Worker com Hono:

```ts
import { Hono } from "hono";
import { ListAllPetsUseCase } from "./modules/pets/application/use-cases/list-all-pets.use-case";

const app = new Hono<{ Bindings: Env }>();

app.get("/admin/pets", async (c) => {
  const useCase = buildListAllPets(c.env); // composição manual (não há DI do Nest)
  const pets = await useCase.execute({ page: 1, limit: 20 });
  return c.json(pets);
});

export default app;
```

2. **Composição de dependências.** Sem o container do Nest, montar os providers na mão (ou `ts-syringe`/`inversify`). Reusar os mesmos ports/repos (ex.: `PrismaPetRepository`, `PrismaPetOwnerInfo`).

3. **Guards/middleware.** Trocar `@Roles`/`JwtAuthGuard` do Nest por middlewares Hono + `jose` (ou `@tsndr/cloudflare-worker-jwt`). A lógica de RBAC (`canManage`, `roleRank`) fica idêntica — é TS puro.

4. **Validação.** Continuar com Zod (o pipe do Nest vira `zodValidator()` do `@hono/zod-validator`).

5. **Prisma.** Trocar `@prisma/adapter-pg` (usa `pg`/TCP) por `@prisma/adapter-pg-worker` (Hyperdrive) ou `@prisma/adapter-neon` (Neon). Ver `banco-de-dados.md`. O client gerado (prisma-client, TS puro, sem query engine) já é compatível com Workers.

6. **Redis.** Trocar `ioredis` por `@upstash/redis` (REST). Ver `cache-e-redis.md`.

## Caminho C — Pages Functions

Mesmo runtime, mas rota a rota em `functions/api/[...path].ts` dentro do projeto Pages. Adequado quando o front já está em Pages e o backend é pequeno. Mesmas limitações do Workers (sem NestJS, Prisma com adapter, Redis via Upstash).

## Caminho A — Manter Node (sem reescrever)

Se o objetivo é só tirar o frontend do VPS e deixar o backend onde está, mantenha NestJS em Node (Railway/Render/Fly/Container) e use a Cloudflare só para Pages/Workers (front) + R2 (fotos) + Hyperdrive/D1. O frontend chama o backend via URL pública (configurar CORS — já fail-closed no projeto).

## Mapeamento NestJS → Workers/Hono (cheatsheet)

| NestJS | Workers/Hono |
|---|---|
| `@Controller` + rotas | `app.get/post/...` Hono |
| `@Roles`/`@Permissions` + Guards | middleware Hono + `canManage`/`roleRank` |
| `ZodValidationPipe` | `@hono/zod-validator` |
| `@Inject(TOKEN)` (DI) | composição manual / `ts-syringe` |
| `ConfigService.getOrThrow` | `env` binding do Worker |
| `@Res()` (PNG QR) | `c.body(bytes, 200, { "Content-Type": "image/png" })` |
| `rawBody` (webhook) | `await request.text()` |
| `@Throttle` (throttler) | `@upstash/ratelimit` em middleware |
