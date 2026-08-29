---
name: blueprint-modulo-pesquisa
description: "Template canônico para criar qualquer módulo de pesquisa (Opinião, Voto, Psicométrica, etc.) seguindo DDD, CQRS, Outbox e as 4 camadas do Senso Político."
---

# Blueprint: Como Criar um Módulo de Pesquisa no Senso Político

Este documento é o **modelo canônico** para criar qualquer módulo de pesquisa
(Opinião, Voto, Psicométrica, etc.) seguindo a arquitetura do projeto.

---

## 1. O que você define como "regra de negócio"

Ao criar um novo módulo (ex: `pesquisa-voto`), você **só precisa especificar**
estas 3 coisas:

### 1.1 O Aggregate raiz (sua tabela principal)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Campos de **identidade** | `id`, `organizationId`, `createdBy` | Padrão — sempre presentes |
| Campos **específicos** do tipo | ex: `cargo`, `turno`, `partido` (voto) | O que diferencia este tipo de pesquisa |
| **Lista de itens** | `Json` | As "perguntas" ou "questões" da pesquisa |
| **Escopo geográfico** | `state`, `city`, `neighborhoods` | Onde a pesquisa é realizada |
| **Status** | `draft → active → closed` | Ciclo de vida padrão |
| `type` | string literal | `"opinion"`, `"vote"`, `"psychometric"` |

> Exemplo (Voto): `cargo: string`, `turno: int`, `partidos: Json[]`

### 1.2 Regras de validação

Responda:

```
1. Quantas questões/opções são obrigatórias?
   Ex: Opinião → min 1 questão, exatamente 5 opções cada
       Voto    → 1 questão (intenção de voto), exatamente N opções (candidatos)

2. Quais campos são obrigatórios vs opcionais?
   Ex: title (obrigatório), description (opcional)

3. Quem pode responder? (INTERVIEWER, PUBLIC, ambos?)

4. Regras específicas de transição de status?
   Ex: draft → active (valida questões > 0); active → closed (manual)
```

### 1.3 Projeções de leitura

| Projeção | Colunas | Atualizada quando? |
|----------|---------|---------------------|
| Listagem  | `id, title, status, questionsCount, responseCount, lastResponseAt` | `SURVEY_CREATED`, `SURVEY_APPLICATION_CREATED`, `SURVEY_ACTIVATED`, `SURVEY_CLOSED` |
| Resultados | Agregação por questão/opção | `SURVEY_APPLICATION_CREATED` |
| Métricas do coletor | `interviewerId, surveyId, neighborhood, city, state` | `SURVEY_APPLICATION_CREATED` |

---

## 2. Estrutura de arquivos (DDD 4 camadas)

```
src/modules/pesquisa-{tipo}/
│
├── pesquisa-{tipo}.module.ts          ← NestJS Module (registra tudo)
│
├── domain/                            ← 🟡 CAMADA 1: Domínio (zero dependências)
│   ├── index.ts
│   ├── aggregates/
│   │   ├── survey-{tipo}.aggregate.ts       ← Aggregate principal (SurveyVoto)
│   │   └── survey-application.aggregate.ts  ← Aplicação da pesquisa (1 = N respostas)
│   ├── entities/
│   │   └── response.entity.ts               ← Entidade pra resposta individual
│   ├── value-objects/
│   │   └── {tipo}-collection.vo.ts          ← Value Object pra lista de itens
│   ├── repositories/
│   │   ├── survey-{tipo}.repository.ts      ← Porta (interface) do repositório
│   │   ├── survey-application.repository.ts
│   │   └── response.repository.ts
│   └── events/
│       ├── index.ts
│       ├── survey-{tipo}-event-types.ts     ← Enum com tipos de evento
│       └── survey-{tipo}-events.ts          ← Interfaces dos eventos
│
├── application/                        ← 🔵 CAMADA 2: Casos de Uso (depende só do domínio)
│   ├── ports/
│   │   ├── survey-{tipo}-repository.port.ts      ← Tokens de DI + portas
│   │   ├── survey-application.repository.port.ts
│   │   └── event-bus.port.ts
│   ├── commands/
│   │   ├── create-survey/
│   │   │   ├── create-survey-{tipo}.command.ts   ← DTO do comando
│   │   │   └── create-survey-{tipo}.handler.ts   ← Handler CQRS
│   │   └── apply-response/
│   │       ├── apply-response.command.ts
│   │       └── apply-response.handler.ts
│   ├── queries/
│   │   ├── list-surveys/
│   │   │   ├── list-surveys.query.ts
│   │   │   └── list-surveys.handler.ts
│   │   ├── get-survey/
│   │   │   ├── get-survey.query.ts
│   │   │   └── get-survey.handler.ts
│   │   └── get-survey-results/
│   │       ├── get-survey-results.query.ts
│   │       └── get-survey-results.handler.ts
│   ├── projectors/
│   │   ├── survey-{tipo}.projector.ts     ← Interface do projector
│   │   └── response.projector.ts
│   └── services/
│       └── {tipo}-report-aggregator.service.ts   ← Agregador de relatórios
│
├── infrastructure/                     ← 🟢 CAMADA 3: Implementações concretas
│   ├── mappers/
│   │   ├── survey-{tipo}.mapper.ts           ← Domain ↔ Prisma (bidirecional)
│   │   ├── survey-application.mapper.ts
│   │   └── response.mapper.ts
│   ├── persistence/
│   │   ├── survey-{tipo}.prisma.repository.ts  ← Implementação concreta
│   │   ├── survey-application.prisma.repo.ts
│   │   └── response.prisma.repository.ts
│   ├── projectors/
│   │   ├── survey-{tipo}.prisma.projector.ts
│   │   └── response.prisma.projector.ts
│   ├── processors/
│   │   └── pesquisa-events.processor.ts      ← Bull Queue consumer
│   └── outbox/
│       ├── outbox.service.ts                 ← Salva/consulta eventos no Outbox
│       └── outbox.processor.ts               ← @Cron(5s) publica eventos pendentes
│
└── presentation/                       ← 🟣 CAMADA 4: HTTP
    ├── controllers/
    │   ├── pesquisa-{tipo}.controller.ts      ← Comandos + queries unificados
    │   ├── interviewer-metrics.controller.ts  ← Métricas de coletores
    │   └── survey-report.controller.ts        ← Relatório completo
    └── dtos/
        └── survey-{tipo}.dto.ts               ← Zod schemas de entrada
```

**Total: ~20 arquivos por módulo de pesquisa**

---

## 3. Fluxo completo de uma aplicação de pesquisa

```
1. Admin cria survey       POST /api/pesquisas         → CreateSurveyHandler
   ├─ Valida regras (domain)                           → Survey.create()
   ├─ Salva no PostgreSQL + Outbox (mesma transação)    → SurveyRepository.save()
   ├─ Cron publica evento no Bull                      → OutboxProcessor
   └─ Processor atualiza projection                    → SurveyProjector

2. Entrevistador coleta   POST /api/pesquisas/:id/respostas → ApplyResponseHandler
   ├─ Busca survey ativa (valida status)               → SurveyRepository.findById()
   ├─ Valida respostas (5 opções, questões válidas...) → Response.create()
   ├─ Cria SurveyApplication (1 = N responses)         → SurveyApplication.create()
   ├─ Dedup: phone + Redis TTL                         → RedisService
   ├─ Salva tudo em 1 transação (application + responses + outbox)
   ├─ Cron publica SURVEY_APPLICATION_CREATED           → OutboxProcessor
   │   ├─ Projector: atualiza SurveyProjection
   │   ├─ Projector: atualiza SurveyResultProjection
   │   ├─ Projector: cria InterviewerMetric
   │   ├─ Processor: invalida cache dashboard          → DashboardCacheService
   │   ├─ Processor: emite WS dashboard                → DashboardGateway
   │   └─ Processor: dispara geocoding async           → GeocodeOutbox
   └─ Retorna 201

3. Admin consulta         GET /api/pesquisas           → ListSurveysHandler
   └─ Leitura direta da projection (sem joins, < 5ms)  → surveyProjection

4. Admin vê resultados    GET /api/pesquisas/:id/resultados → GetSurveyResultsHandler
   └─ Leitura direta da projection de resultados        → surveyResultProjection
```

---

## 4. Padrões obrigatórios

### 4.1 CQRS: Comandos (write) e Queries (read) separados

```
application/commands/   → comandos (POST, PUT, PATCH) — usam repositórios de domínio
application/queries/    → consultas (GET)              — leem direto das projections
```

### 4.2 Outbox Pattern

```
Toda mutation no aggregate:
  1. Gera evento de domínio (aggregate.pullEvents())
  2. Salva aggregate + outbox NA MESMA TRANSAÇÃO PRISMA
  3. Cron (@Cron('*/5 * * * * *')) publica eventos pendentes no Bull
  4. Processor consome e dispara side effects (projections, cache, WS, email)
```

### 4.3 Projeções (CQRS Read Side)

```
SurveyProjection         → listagem rápida (id, title, status, responseCount, ...)
SurveyResultProjection   → agregação por questão/opção (questionId, optionIndex, voteCount)
InterviewerMetric        → métricas do coletor (interviewerId, neighborhood, city, state)
```

### 4.4 Mappers bidirecionais

Cada mapper faz:
- `toDomain(prismaRecord) → Aggregate`
- `toPersistence(aggregate) → PrismaCreateInput`

### 4.5 Zod validation nos DTOs

NUNCA usar `class-validator`. Sempre `z.object({...})` + `ZodValidationPipe`.

---

## 5. Checklist: o que copiar/adaptar ao criar um novo módulo

### Schema Prisma (adicionar ao `prisma/schema.prisma`)

```prisma
// ── TABELAS DE ESCRITA ──
model SurveyVoto {
  // Mesma estrutura base do Survey, com campos específicos
  cargo    String    // específico: Presidente, Governador, etc.
  turno    Int       // específico: 1 ou 2
  partidos Json      // específico: [{sigla, nome, numero}]
  // ... resto idêntico ao Survey (title, status, type, scope, timestamps)
}

// ── TABELAS DE LEITURA (projections) ──
model SurveyVotoProjection {
  // idêntico ao SurveyProjection + campos específicos se necessário
}

model SurveyVotoResultProjection {
  // idêntico ao SurveyResultProjection (agregação por questão/opção)
}

// ── OU compartilhe as tabelas existentes (Survey, SurveyProjection, etc.) ──
// Basta usar o campo `type` pra diferenciar: "opinion" | "vote" | "psychometric"
```

### Tokens de DI (no arquivo de portas)

```typescript
export const SURVEY_VOTO_REPOSITORY = Symbol('SURVEY_VOTO_REPOSITORY');
export const SURVEY_VOTO_APPLICATION_REPOSITORY = Symbol('SURVEY_VOTO_APPLICATION_REPOSITORY');
export const SURVEY_VOTO_PROJECTOR = Symbol('SURVEY_VOTO_PROJECTOR');
```

### Module (`pesquisa-voto.module.ts`)

```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    InterviewerModule,
    ParticipantModule,
    BullModule.registerQueue(
      { name: QUEUES.PESQUISA_EVENTS },
      { name: QUEUES.SURVEY_PROCESSING },
      { name: QUEUES.RESPONSE_PROCESSING },
    ),
  ],
  controllers: [
    PesquisaVotoController,       // CRUD + apply response
    InterviewerMetricsController, // (compartilhado)
    SurveyVotoReportController,   // relatório específico
  ],
  providers: [
    // Handlers CQRS
    CreateSurveyVotoHandler,
    ApplyResponseVotoHandler,
    ListSurveysVotoHandler,
    GetSurveyVotoHandler,
    GetSurveyVotoResultsHandler,
    
    // Repositórios
    { provide: SURVEY_VOTO_REPOSITORY, useClass: SurveyVotoPrismaRepository },
    { provide: SURVEY_VOTO_APPLICATION_REPOSITORY, useClass: SurveyApplicationPrismaRepository },
    
    // Projectors
    { provide: SURVEY_VOTO_PROJECTOR, useClass: SurveyVotoPrismaProjector },
    
    // Outbox + Events + Report
    OutboxService,
    OutboxProcessor,
    VotoReportAggregator,
    PesquisaEventsProcessor,
  ],
  exports: [...handlers],
})
```

---

## 6. Perguntas que você responde pra cada novo módulo

> **Copie e cole este bloco pra iniciar um novo módulo:**

```
Tipo de pesquisa: ___________
(ex: Voto, Psicométrica, Satisfação, etc.)

1. Tabela principal — campos específicos:
   - ___________ (tipo: ___________)
   - ___________ (tipo: ___________)

2. Itens da pesquisa (Json):
   - Estrutura: { ___________ }
   - Validação: ___________ (ex: min 1, max 10)
   - Opções: ___________ (ex: exatamente 5, variável 2..10, etc.)

3. Quem responde:
   [ ] INTERVIEWER (entrevistador de campo)
   [ ] PUBLIC (link público)
   [ ] Ambos

4. Estados do ciclo de vida:
   draft → [ ] active → [ ] closed
   Outros: ___________

5. Projeções de leitura extras necessárias:
   - ___________: colunas ___________

6. Relatório específico:
   - Fórmulas/tabelas: ___________
   - Agregações especiais: ___________

7. Integração com IA (DeepSeek):
   - [ ] Sim, interpretação estatística
   - [ ] Não
   - Tipo de análise: ___________ (ex: preferência entre candidatos)
```

---

## 7. Tabela de referência: pesquisa-opiniao

| Arquivo | Função |
|---------|--------|
| `domain/aggregates/survey.aggregate.ts` | Aggregate Survey: validação (title ≥ 3), status (draft→active→closed), eventos (created/activated/closed) |
| `domain/aggregates/survey-application.aggregate.ts` | Aggregate SurveyApplication: 1 aplicação = N respostas atômicas, lat/lng do participante + collectLat/collectLng do entrevistador |
| `domain/entities/response.entity.ts` | Entidade Response: questionId + answer (0-4) + participantId + interviewerId |
| `domain/value-objects/question-collection.vo.ts` | QuestionCollection: array de questões, cada uma com 5 opções exatas |
| `domain/events/survey-events.ts` | Tipos de eventos: Created, Activated, Closed, ResponseRecorded, SurveyApplicationCreated |
| `domain/repositories/` | 3 interfaces: SurveyRepository, SurveyApplicationRepository, ResponseRepository |
| `application/commands/create-survey/` | Comando + handler: valida com Zod, cria Survey, salva via repositório |
| `application/commands/apply-response/` | Comando + handler: valida respostas, dedup (Redis+DB), transação atômica |
| `application/queries/*/` | 3 queries: list (projection), get (projection ou survey), get-results (projection) |
| `application/projectors/` | 2 interfaces: SurveyProjector (onSurveyCreated/Activated/Closed/ApplicationCreated), ResponseProjector (onSurveyApplicationCreated) |
| `application/services/opinion-report-aggregator.service.ts` | Agrega respostas com SQL raw, calcula distribuição, invalida cache |
| `infrastructure/mappers/` | 3 mappers: SurveyMapper, SurveyApplicationMapper, ResponseMapper (Prisma ↔ Domain) |
| `infrastructure/persistence/` | 3 repositories: Prisma implementations (findById, save com transação, etc.) |
| `infrastructure/projectors/` | 2 projectors: Prisma implementations (upsert projection tables + cache invalidation) |
| `infrastructure/processors/pesquisa-events.processor.ts` | Bull consumer: escuta eventos, chama projectors, emite WebSocket |
| `infrastructure/outbox/` | OutboxService (salva/publica/consulta) + OutboxProcessor (cron 5s) |
| `presentation/controllers/pesquisa.controller.ts` | Controller unificado: POST criar, POST responder, GET listar, GET detalhe, GET resultados |
| `presentation/controllers/interviewer-metrics.controller.ts` | GET métricas agregadas e por entrevistador |
| `presentation/controllers/survey-report.controller.ts` | GET relatório com cache + estatísticas + IA DeepSeek |
| `presentation/dtos/survey.dto.ts` | Zod schemas: createSurveySchema, applyResponseSchema |

---

## 8. Prisma Models associados

```prisma
// ── ESCRITA ──
model Survey {          // aggregate principal (compartilhado via type)
model SurveyApplication // aplicação atômica (1 = N responses)
model Response          // resposta individual
model OutboxEvent       // outbox genérico (compartilhado)

// ── LEITURA ──
model SurveyProjection       // listagem rápida
model SurveyResultProjection // agregação questão × opção
model InterviewerMetric      // métricas do coletor

// ── SUPORTE ──
model PublicSurvey       // link público
model GeocodeOutbox      // geocodificação assíncrona
model SurveyCacheReport  // cache de relatórios
```

---

**Última atualização:** 2026-08-07
**Baseado em:** `src/modules/pesquisa-opiniao/` (41 arquivos, ~2000 linhas)
