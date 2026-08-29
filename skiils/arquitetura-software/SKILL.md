---
name: arquitetura-ddd
description: "Domain-Driven Design completo: estratégico (Bounded Contexts, Context Map, Subdomains), tático (Entities, Value Objects, Aggregates, Domain Events), integração (Saga, Outbox, CQRS com DDD), performance e versionamento de modelos."
---

# Arquitetura DDD — O Guia Definitivo

DDD é a ÚNICA arquitetura que usamos. Todo sistema é modelado a partir do domínio. Código fala a linguagem do negócio. Domínio não depende de infraestrutura. Frameworks são detalhes.

## Quando usar (sempre)

- Modelando QUALQUER sistema com regras de negócio
- Estruturando times em torno de Bounded Contexts
- Implementando comunicação entre contextos (Domain Events, Integration Events)
- Versionando modelos de domínio e eventos
- Otimizando performance sem violar o domínio

## Fluxo DDD

1. **Descobrir** o domínio (Event Storming, Domain Storytelling) → Bounded Contexts
2. **Modelar** o tático (Entities, Value Objects, Aggregates, Domain Events)
3. **Isolar** o domínio (Ports & Adapters, Dependency Inversion)
4. **Integrar** contextos (Integration Events, Saga, CQRS)
5. **Versionar** modelos com evolução segura

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [ddd-estrategico.md](references/ddd-estrategico.md) | Bounded Contexts, Ubiquitous Language, Subdomains, Context Map |
| [ddd-tatico.md](references/ddd-tatico.md) | Entities, Value Objects, Aggregates, Repositories, Domain Services, Events, Factories |
| [ddd-arquitetura.md](references/ddd-arquitetura.md) | Camadas DDD, Hexagonal, Clean Architecture, Vertical Slice + DDD |
| [ddd-integracao.md](references/ddd-integracao.md) | Domain Events vs Integration Events, Saga, Outbox, CQRS, Event Sourcing |
| [ddd-performance.md](references/ddd-performance.md) | Performance em sistemas DDD, latência, cache respeitando o domínio |
| [ddd-versionamento.md](references/ddd-versionamento.md) | Versionamento de modelos, event versioning, schema evolution, SemVer |
| [ddd-roadmap.md](references/ddd-roadmap.md) | Aprendizado DDD, livros, standards, open-source que usa DDD |
| [ddd-ia.md](references/ddd-ia.md) | IA no contexto DDD: AI como Domain Service, RAG em Bounded Contexts |
