# Frontend Next.js na Cloudflare

## Opções (ordem de recomendação)

1. **vinext** (recomendado 2026) — Vite plugin que reimplementa a API do Next.js; mantém `app/`, `pages/`, `next.config.js`, `public/`. Deploy no Workers.
2. **OpenNext** (`@opennextjs/cloudflare`) — legacy; manter só se já usa OpenNext.
3. **Static export** no Pages — só se `output: "export"` (app sem SSR/route handlers).

## vinext (recomendado)

```bash
# check de compatibilidade (roda no diretório do projeto)
npx vinext check

# init não-destrutivo (mantém o next dev funcionando)
npx vinext init        # escolher "Cloudflare Workers"

# dev / build / deploy
npm run dev:vinext
npm run build:vinext
npx @vinext/cloudflare deploy
```

- Suporta App Router, RSC, Server Actions, SSR (streaming), ISR (stale-while-revalidate), middleware/proxy, bindings via `cloudflare:workers`.
- `next/*` "mostly supported" — consultar https://vinext.dev/compatibility.
- Agente: `npx skills add cloudflare/vinext` + prompt "migrate this project to vinext".

## C3 (projeto novo)

```bash
npm create cloudflare@latest -- my-next-app --framework=next
```

## OpenNext (legacy)

```bash
npm i -D @opennextjs/cloudflare
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

## Static export no Pages

- `next.config.js`: `output: "export"`.
- `npm run build` → `out/`.
- Deploy via Git integration ou Direct Upload (`npx wrangler pages deploy out`).

## Acesso a bindings no Next

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare"; // OpenNext
// ou, no vinext:
import { env } from "cloudflare:workers";
```

## Observação para este projeto

O `frontadmincoleira` é App Router + React Query (client-heavy, chama a API via Bearer JWT). Para Workers, o build via vinext preserva isso; os bindings (`cloudflare:workers`) só são necessários se houver Server Actions/route handlers no Next que precisem tocar em D1/KV/R2 diretamente. Como o admin chama a API do backend via HTTP, o frontend é em grande parte estático + client-side → o caminho mais simples é vinext (SSR) ou static export.
