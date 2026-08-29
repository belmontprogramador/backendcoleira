# Plataforma Cloudflare (Workers, Pages, Functions)

## Workers vs Pages vs Pages Functions

| | Workers | Pages | Pages Functions |
|---|---|---|---|
| O que é | plataforma serverless primária (compute) | hospedagem de front-end (estático + SSR) | código server-side atrelado a um projeto Pages |
| Runtime | workerd (V8 isolates) | build + assets | Workers runtime embutido |
| Entry point | `fetch(request, env, ctx)` | assets estáticos | `functions/` + `_middleware.ts` |
| Recomendação (2026) | **Workers é o padrão para projetos novos** (o docs sugere migrar de Pages) | manter para static export / sites | só quando já se está em Pages e precisa de rotas dinâmicas |

> O docs oficial (ago/2026): "Workers supports most Pages use cases... Start new projects with Workers." → **novos projetos: Workers**; Pages fica para sites estáticos e casos específicos.

## Modelo de execução (o ponto-chave)

Workers NÃO roda um servidor HTTP de longa duração. Cada request invoca o handler:

```ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("ok");
  },
};
```

- Sem `listen()`/socket TCP de entrada.
- Execução efêmera por request (limites de CPU/time), depois congela.
- `ctx.waitUntil()` para trabalho pós-resposta (ex.: logging, enfileirar).

## Node.js compatibility

- Para compat date **≥ 2026-08-04**, `nodejs_compat` + `nodejs_compat_v2` já são **default** (não precisa declarar flag).
- APIs nativas 🟢: `crypto`, `Buffer`, `http`/`https` (cliente), `net` (saída), `AsyncLocalStorage`, `stream`, `zlib`, `events`, `fs` (limitado), `path`, `util`, `timers`.
- O resto é polyfill via `unenv`; métodos não implementados lançam `[unenv] ... is not implemented yet!`.
- **`net.createServer()`/servidor HTTP de entrada NÃO funcionam.** `http` aqui é para requests de saída (ex.: `fetch`, ou drivers via Hyperdrive).

Conclusão: a "Node.js compatibility" permite usar libs Node (ex.: `pg` via Hyperdrive, Prisma com adapter), **mas não** roda um framework que faz `listen()` (Express/Fastify/NestJS).

## Bindings

Recursos externos (KV, D1, R2, Hyperdrive, Queues, secrets) são expostos via `env`:

```ts
interface Env {
  DB: Hyperdrive;
  CACHE: KVNamespace;
  BUCKET: R2Bucket;
  API_SECRET: string;
}
```

- No `wrangler` você declara o binding; `wrangler types` gera os tipos.
- Secrets são bindings de string definidos via `wrangler secret put` (não ficam no config).
- No Next.js (vinext), importe `env` de `cloudflare:workers`.

## Compat date / flags

```jsonc
{ "compatibility_date": "2026-08-04" } // nodejs_compat implícito
// ou, para datas < 2026-08-04:
{ "compatibility_date": "2025-02-04", "compatibility_flags": ["nodejs_compat"] }
```
