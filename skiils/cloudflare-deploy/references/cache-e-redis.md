# Cache, sessão e Redis na Cloudflare

## O problema

Nosso backend usa Redis via TCP (`ioredis`/`redis`) em: `RedisService`, `RedisRefreshTokenStore`, `RedisTemporaryTokenStore`, `RedisPublicProfileInvalidation`, e o throttler (`@nestjs/throttler` + `@nest-lab/throttler-storage-redis`). Nada disso roda em Workers como está (cliente TCP genérico não é suportado de forma estável; o ioredis é pesado para o runtime).

## Substituições

| Recurso atual | Cloudflare |
|---|---|
| Refresh/temporary token store | **Upstash Redis** (REST) ou **KV** |
| Throttle/rate limit | **Upstash Ratelimit** ou KV com contadores |
| Cache de perfil público | **KV** (ou cache API do Cloudflare) |
| Fotos de pets (`LocalPetStorageService`/`S3PetStorageService`) | **R2** (S3-compatible, sem egress fee) |
| Filas (futuro) | **Queues** |

## Upstash Redis (REST, roda em Workers)

```bash
npm i @upstash/redis
```

```ts
import { Redis } from "@upstash/redis";
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,   // https://...
  token: env.UPSTASH_REDIS_REST_TOKEN,
});
await redis.set("key", "value", { ex: 60 });
await redis.get("key");
```

- Sem pooling; cada chamada é HTTP.
- Substitui os stores de refresh/token 1:1 (mesma semântica SET/GET/DEL/EX/TTL).

## Upstash Ratelimit (throttler)

```bash
npm i @upstash/ratelimit @upstash/redis
```

```ts
import { Ratelimit } from "@upstash/ratelimit";
const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});
const { success } = await limiter.limit(key);
```

Substitui o `ThrottlerGuard`/storage. A lógica de `@Throttle` vira chamadas manuais ou um middleware Hono.

## KV (session/config)

- Eventualmente consistente; ideal para cache/sessão; limite ~1 write/s por key.
- Binding `KVNamespace`; `env.CACHE.get/put(key, val, { expirationTtl })`.

## R2 (fotos/upload)

- S3-compatible. Trocar `S3PetStorageService` para apontar ao R2 (endpoint `https://<accountid>.r2.cloudflarestorage.com`, access key/secret). SDK AWS v3 (`@aws-sdk/client-s3`) funciona com endpoint custom.
- Binding direto `R2Bucket` via `env.BUCKET.put(...)` também é possível (mais simples no Worker).

## Filas (futuro)

Se surgirem jobs assíncronos (emails, webhooks), usar **Queues** no lugar de Redis/pub-sub.
