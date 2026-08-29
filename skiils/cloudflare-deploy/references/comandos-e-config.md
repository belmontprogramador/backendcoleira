# Wrangler, config, secrets e CI/CD

## Setup do CLI

```bash
npm i -g wrangler
wrangler login                # OAuth
wrangler whoami
```

## wrangler.jsonc mínimo (Workers)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "coleira-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-08-04",       // nodejs_compat implícito
  "observability": { "enabled": true },
  "vars": { "PUBLIC_BASE_URL": "https://..." },  // não-secretos
  "hyperdrive": [
    { "binding": "DB", "id": "<ID>", "localConnectionString": "postgres://..." }
  ],
  "r2_buckets": [ { "binding": "BUCKET", "bucket_name": "pet-photos" } ],
  "kv_namespaces": [ { "binding": "CACHE", "id": "<KV_ID>" } ]
}
```

- Formato TOML (`wrangler.toml`) também aceito.
- `vars` = não-secreto (build-time); **secrets** via `wrangler secret put`.

## Secrets

```bash
wrangler secret put DATABASE_URL        # vai pedir o valor (ou via stdin)
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put JWT_SECRET
```

Secrets NUNCA no `vars`/repo; o `env.validation.ts` (Zod) continua exigindo-os.

## Deploy

```bash
wrangler deploy                  # produção (workers.dev ou custom domain)
wrangler deploy --env staging    # com ambientes
wrangler types                   # gera tipos dos bindings em worker-configuration.d.ts
wrangler tail                    # logs em tempo real
```

## Rotas/domínio

- Dev: `https://coleira-api.<subdomain>.workers.dev`.
- Custom domain: `wrangler deploy` + configurar route/domain no dashboard ou `routes` no config.

## Migrations do banco (etapa de CI, fora do Worker)

```bash
prisma generate                  # build (gera client TS)
prisma migrate deploy            # aplica migrations via DIRECT_URL (Hyperdrive/Neon)
```

## GitHub Actions (deploy + migrate)

```yaml
name: deploy
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```

## Pages (se for o caminho Pages)

```bash
npx wrangler pages deploy out          # direct upload (static)
# ou conectar Git provider no dashboard (auto-build)
```

## Checagem pós-deploy

- `curl https://<url>/health` → 200.
- `wrangler tail` para erros de binding/secret ausente.
- Verificar `compatibility_date` (erros de `node:` module costumam ser flag/compat).
