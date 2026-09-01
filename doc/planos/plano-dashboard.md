# Plano de Implementação — Dashboard de Métricas e KPIs

> **Status:** aguardando aprovação do Belmont.
> **Data:** 2026-09-01
> **Escopo:** módulo de métricas/KPIs administrativos (backend NestJS + frontadmin).

---

## 1. Objetivo

Substituir o dashboard atual (que é um *hack*: `getDashboardStats` chama `GET /admin/users`
duas vezes e mostra "Pets"/"Assinaturas" como placeholder) por um **módulo de métricas real**,
com KPIs de assinaturas, pets, tutores, scans e indicadores extras, todos **filtráveis por
período e granularidade**, consumidos por uma tela de dashboard com cards + gráficos.

---

## 2. Estado atual

- **Backend:** nenhum endpoint de métricas/KPI. Existem listagens paginadas por domínio
  (`/admin/users`, `/admin/subscriptions`, `/admin/pets`, `/admin/tags`, `/contacts`, etc.),
  mas nada agregado.
- **Frontend (`frontadmin`):** `src/app/dashboard/page.tsx` renderiza 4 cards; só 2 reais
  (total/ativos de usuários) via `getDashboardStats` (2 chamadas a `listUsers`).
- **Schema Prisma:** já contém tudo o necessário (ver §4). **Não precisa criar tabelas novas**
  — só índices de apoio (§8).

---

## 3. Escopo

### Dentro do escopo (fase 1)
- Módulo backend `Dashboard` com endpoint agregado `GET /admin/dashboard`.
- KPIs de: **assinaturas, pets, tutores, scans, contatos/mensagens, NFC/produção, receita**.
- **Séries temporais** (timeseries) para gráficos: signups, scans, receita, novas assinaturas.
- **Filtros por período** (`from`/`to`) e **granularidade** (`day`/`week`/`month`).
- Tela de dashboard no frontadmin com cards + gráficos + filtro de período.
- Índices de banco para as agregações.

### Fora do escopo (fases futuras)
- Drill-down por entidade (clicar num KPI e abrir a listagem já filtrada).
- Filtros avançados por `planCode`/`source`/`status` no endpoint de métricas (o schema de query
  já nasce preparado, mas o consumo visual fica para a fase 2).
- Dashboard do operador (área de produção NFC) — hoje já tem cards estáticos próprios.
- Exportação (CSV/PDF) e alertas/anomalias.
- Cache de métricas (Redis) — decidimos **não** cachear agora; ver §11.

---

## 4. Modelo de dados disponível (já no schema)

| KPI | Model(s) | Campos-chave |
|-----|----------|--------------|
| Tutores | `User` | `status`, `created_at`, `email_verified_at`, `deleted_at` |
| Pets | `Pet` | `created_at`, `lost_status`, `species`, `photo_url`, `deleted_at` |
| Assinaturas | `Subscription` + `Plan` | `status`, `started_at`, `cancelled_at`, `current_period_end`, `plan.price_cents` |
| Receita | `PaymentTransaction` | `status`, `amount_cents`, `created_at`, `payment_method` |
| Scans | `AccessEvent` | `source`, `device_type`, `created_at`, `ip_hash`, `location_approx` |
| Contatos | `ContactMessage` | `created_at`, `read_at`, `location_approx` |
| NFC | `NfcTag` + `Batch` | `status`, `activated_at`, `created_at` |

---

## 5. Arquitetura backend (DDD — 4 camadas + DIP + TDD)

Novo módulo **`src/modules/dashboard/`**, seguindo o padrão dos demais módulos.

```
src/modules/dashboard/
├── domain/
│   ├── value-objects/
│   │   ├── date-range.vo.ts
│   │   └── __tests__/date-range.vo.spec.ts
│   └── repositories/
│       └── dashboard-metrics.port.ts        ← porta (read model)
├── application/
│   ├── dtos/
│   │   ├── dashboard-query.schema.ts        ← Zod: from/to/granularity
│   │   └── __tests__/dashboard-query.schema.spec.ts
│   ├── use-cases/
│   │   ├── get-dashboard-overview.use-case.ts
│   │   └── __tests__/get-dashboard-overview.use-case.spec.ts
│   └── mappers/
│       └── dashboard-response.mapper.ts (+ spec)
├── infrastructure/
│   ├── prisma-dashboard-metrics.repository.ts
│   └── __tests__/prisma-dashboard-metrics.repository.spec.ts
├── presentation/
│   └── controllers/
│       ├── admin-dashboard.controller.ts
│       └── __tests__/admin-dashboard.controller.spec.ts
└── dashboard.module.ts
```

### Porta (read model) — `DashboardMetricsPort`

Interface única de agregação, com métodos pequenos e testáveis (cada um vira 1 query):

```ts
export interface DashboardMetricsPort {
  countUsers(range: DateRange): Promise<UserMetrics>
  countPets(range: DateRange): Promise<PetMetrics>
  subscriptionStats(range: DateRange): Promise<SubscriptionMetrics>
  paymentStats(range: DateRange): Promise<PaymentMetrics>
  scanStats(range: DateRange): Promise<ScanMetrics>
  contactStats(range: DateRange): Promise<ContactMetrics>
  nfcStats(range: DateRange): Promise<NfcMetrics>
  timeseries(metric: TimeseriesMetric, range: DateRange, granularity: Granularity): Promise<SeriesPoint[]>
}
```

> Cada método retorna um **read-model DTO** tipado (não entidades de domínio). O use case
> `GetDashboardOverviewUseCase` orquestra todos em `Promise.all` e monta o payload final.

### Value Object — `DateRange`

- `from` (default: 30 dias atrás), `to` (default: agora), ambos normalizados em UTC.
- Valida `from <= to`.
- Teto de range (ex.: **366 dias**) para evitar query pesada.
- Expõe `start`/`end` já no formato esperado pelo repositório.

---

## 6. Contrato da API

### `GET /admin/dashboard`

**Auth:** `@Roles('ADMIN')` (ADMIN e SUPER_ADMIN; SUPER_ADMIN > ADMIN na hierarquia).

**Query params (Zod):**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `from` | ISO date | hoje−30d | início do período (inclusive) |
| `to` | ISO date | hoje | fim do período (inclusive) |
| `granularity` | `day \| week \| month` | `day` | bucket das séries temporais |

*(O schema já reserva, para fase 2, os opcionais `planCode`, `source`, `status` — sem consumo visual agora.)*

### Resposta `200` (camelCase, padrão admin)

```jsonc
{
  "period": { "from": "...", "to": "...", "granularity": "day", "days": 30 },
  "kpis": {
    "users": {
      "total": 250, "new": 18, "active": 210, "blocked": 4,
      "pendingVerification": 12, "verifiedEmail": 180, "premium": 65
    },
    "pets": {
      "total": 120, "new": 9, "lost": 3, "withPhoto": 90,
      "bySpecies": { "Cão": 80, "Gato": 38, "Outro": 2 }
    },
    "subscriptions": {
      "active": 65, "trialing": 3, "pastDue": 1, "cancelled": 8, "expired": 2,
      "new": 7, "churn": 2, "mrrCents": 129350,
      "premiumCount": 65, "basicCount": 180,
      "upcomingRenewals7d": 4, "upcomingRenewals30d": 12
    },
    "payments": {
      "revenueCents": 39800, "approvedCount": 12, "pendingCount": 2,
      "rejectedCount": 1, "avgTicketCents": 3317, "conversionRate": 0.8
    },
    "scans": {
      "total": 532, "uniquePets": 44, "uniqueVisitors": 210,
      "bySource": { "NFC": 310, "QR": 180, "DIRECT": 42 },
      "topPets": [ { "petId": "c...", "name": "Thor", "count": 38 } ]
    },
    "contacts": { "total": 24, "unread": 9, "withLocation": 15 },
    "nfc": {
      "totalTags": 1500, "activeTags": 214, "lostTags": 3,
      "activatedInPeriod": 12, "byStatus": { "CREATED": 900, "ACTIVE": 214, "LOST": 3 }
    }
  },
  "timeseries": {
    "signups":        [ { "bucket": "2026-08-01", "value": 4 } ],
    "scans":          [ { "bucket": "2026-08-01", "value": 12 } ],
    "revenue":        [ { "bucket": "2026-08-01", "valueCents": 1990 } ],
    "newSubscriptions":[ { "bucket": "2026-08-01", "value": 2 } ]
  }
}
```

**Erros:** `400` (range inválido / granularity inválido via Zod), `401`, `403` (não-ADMIN).

---

## 7. KPIs detalhados (por categoria)

### 7.1 Assinaturas
| KPI | Definição |
|-----|-----------|
| `active` / `trialing` / `pastDue` / `cancelled` / `expired` | contagem atual por `status` |
| `new` | assinaturas com `started_at` dentro do período |
| `churn` | assinaturas com `cancelled_at` dentro do período |
| `mrrCents` | soma de `plan.price_cents` das assinaturas `ACTIVE`+`TRIALING` (mensal; se `interval=YEARLY`, divide por 12) |
| `premiumCount` / `basicCount` | ativas+trialing agrupadas por `plan.code` |
| `upcomingRenewals7d/30d` | assinaturas ativas com `current_period_end` dentro dos próximos 7/30 dias |

### 7.2 Pets
| KPI | Definição |
|-----|-----------|
| `total` | pets não deletados (`deleted_at IS NULL`) |
| `new` | `created_at` dentro do período |
| `lost` | `lost_status = true` (atual) |
| `withPhoto` | `photo_url` não nulo |
| `bySpecies` | contagem por `species` |

### 7.3 Tutores (users)
| KPI | Definição |
|-----|-----------|
| `total` | usuários não deletados |
| `new` | `created_at` dentro do período |
| `active` / `blocked` / `pendingVerification` | contagem por `status` (não deletados) |
| `verifiedEmail` | `email_verified_at` não nulo |
| `premium` | usuários com assinatura ativa/trialing de plano `PREMIUM` |

### 7.4 Scans (access_events)
| KPI | Definição |
|-----|-----------|
| `total` | eventos no período |
| `uniquePets` | `DISTINCT pet_id` no período |
| `uniqueVisitors` | `DISTINCT ip_hash` no período |
| `bySource` | contagem por `source` (`NFC`/`QR`/`DIRECT`) |
| `topPets` | top 5 pets com mais eventos no período (nome + count) |

### 7.5 Extras (sugeridos)
| KPI | Definição |
|-----|-----------|
| `payments.revenueCents` | soma `amount_cents` de `PaymentTransaction.status=APPROVED` no período |
| `payments.approved/pending/rejectedCount` | contagem por status |
| `payments.avgTicketCents` | média `amount_cents` das aprovadas |
| `payments.conversionRate` | aprovadas / total no período (0 se total=0) |
| `contacts.total` / `unread` / `withLocation` | mensagens no período / `read_at IS NULL` / `location_approx` não nulo |
| `nfc.totalTags` / `activeTags` / `lostTags` / `activatedInPeriod` / `byStatus` | produção |

### 7.6 Séries temporais (gráficos)
- `signups` — novos usuários por bucket.
- `scans` — eventos de acesso por bucket.
- `revenue` — receita aprovada por bucket (`valueCents`).
- `newSubscriptions` — novas assinaturas por bucket.

Bucketing SQL via `date_trunc('day'|'week'|'month', created_at)`.

---

## 8. Índices de banco (migration)

Para agregações por `created_at`/`status` ficarem rápidas (tabelas `access_events` e
`payment_transactions` crescem rápido):

```prisma
// adicionar aos models existentes
model User {
  // ... + @@index([created_at])
}
model Pet {
  // ... + @@index([created_at])
}
model PaymentTransaction {
  // ... + @@index([status, created_at])
}
model ContactMessage {
  // ... já tem @@index([created_at])
}
model AccessEvent {
  // ... já tem @@index([created_at])
}
```

**Migration:** `npx prisma migrate dev --name add_dashboard_indexes`.

> `Subscription` já tem `@@index([status])` e `@@index([current_period_end])` — suficiente.

---

## 9. Frontend (`frontadmin`)

### Novos arquivos
- `src/types/api.ts` — tipos `DashboardOverview`, `DashboardKpis`, `DashboardTimeseries`, `PeriodInfo`, `Granularity`.
- `src/lib/dashboard.ts` — `getDashboard(params)` → `apiFetch<DashboardOverview>('/admin/dashboard?...')`.
- `src/components/dashboard/date-range-filter.tsx` — presets (`7d`/`30d`/`90d`) + data custom + granularidade.
- `src/components/dashboard/kpi-card.tsx` — card reutilizável (label, valor, delta %, ícone).
- `src/components/dashboard/timeseries-chart.tsx` — gráfico de linha/área (recharts).
- Rework de `src/app/dashboard/page.tsx`.

### Dependência nova
- **`recharts`** (gráficos). Não há lib de chart hoje. *(Alternativa: componentes `shadcn/charts`, que embrulham recharts.)*

### Layout da tela
1. **Filtro de período** (topo): presets 7/30/90 dias + granularidade day/week/month.
2. **Grid de cards KPIs** (linha 1): Tutores, Pets, Assinaturas ativas, MRR.
3. **Grid de cards KPIs** (linha 2): Scans, Receita, Mensagens não lidas, Tags ativas.
4. **Gráficos** (2×2): signups, scans, receita, novas assinaturas.
5. **Remover** o `getDashboardStats` (hack) — o `page.tsx` passa a usar `getDashboard`.

---

## 10. Fases de implementação (TDD estrito)

> Fluxo obrigatório do projeto: **teste unitário → teste de integração → implementação**.
> Testes co-localizados em `__tests__/`; e2e em `test/` (roda `--runInBand`).

### Fase 0 — Fundamentos
1. `DateRange` VO + spec (default 30d, `from<=to`, teto 366d, normalização UTC).
2. `DashboardQuerySchema` (Zod) + spec.
3. `DashboardMetricsPort` (tipos read-model).
4. Migration de índices (§8).

### Fase 1 — Repositório (read model, Prisma)
5. `PrismaDashboardMetricsRepository` implementando a porta, com `$queryRaw`/`groupBy`.
6. Spec de integração do repositório (banco real, seed isolado) — um `it` por método.

### Fase 2 — Use case + mapper + controller
7. `GetDashboardOverviewUseCase` (orquestra em `Promise.all`) + spec (porta mockada).
8. `DashboardResponseMapper` + spec.
9. `AdminDashboardController` (`GET /admin/dashboard`, `@Roles('ADMIN')`) + spec.
10. `DashboardModule` + registrar no `AppModule`.

### Fase 3 — E2E backend
11. `test/dashboard.e2e-spec.ts`: seed controlado (usuários/pets/assinaturas/scans/pagamentos)
    → valida KPIs exatos e séries temporais; valida `403` para USER e `400` para range inválido.

### Fase 4 — Frontend
12. Tipos + `getDashboard`.
13. Componentes de filtro/cards/chart.
14. Rework de `page.tsx`; remover `getDashboardStats` obsoleto.

### Fase 5 — Validação
15. Backend: `npm run build`, `npm run lint`, `npm test`, `npm run test:e2e`.
16. Front: `next build` + `tsc --noEmit`.

---

## 11. Decisões / riscos

| Tema | Decisão |
|------|---------|
| **Cache** | NÃO cachear métricas agora (Redis). Agregações são leves com índices; cache traria problema de invalidação em dados vivos. Reavaliar se o volume crescer. |
| **Read model separado** | Métricas ficam numa porta dedicada (`DashboardMetricsPort`), sem contaminar os repositórios de escrita existentes. |
| **MRR** | Só planos mensais hoje (interval=MONTHLY). Fórmula já normaliza YEARLY→/12 para futuro. |
| **Receita por período** | Usa `created_at` da transação aprovada (simples). Se precisar da data exata de aprovação, trocar por `updated_at` — flag na doc. |
| **`@Roles('ADMIN')`** | Dashboard é administrativo; SUPER_ADMIN enxerga por ser superior na hierarquia. Operador mantém a tela de produção atual. |
| **Granularity** | `date_trunc` em UTC. Buckets `week` iniciam na segunda (padrão Postgres). |
| **Performance** | Índices em `created_at` (§8) + teto de 366 dias + `topPets` limitado a 5. |

---

## 12. Estimativa (ordem de grandeza)

- Backend: ~8–10 arquivos novos + 1 migration + specs (unit + integração + e2e).
- Frontend: ~5–6 arquivos novos + 1 rework + dependência `recharts`.
- Esforço: médio (1 sessão de trabalho dedicada, seguindo TDD).

---

## 13. Aprovação necessária

Confirmar antes de codar:
1. **Escopo do endpoint:** um único `GET /admin/dashboard` agregado (recomendado) vs. um endpoint por domínio.
2. **Filtros fase 1:** só `from`/`to`/`granularity` (recomendado); `planCode`/`source`/`status` ficam preparados mas sem UI (fase 2).
3. **Gráficos:** `recharts` ok como dependência nova?
4. **MRR/churn:** definições do §7.1 ok?
