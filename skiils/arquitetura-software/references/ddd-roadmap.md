# Roadmap DDD — Aprendizado e Recursos

## 1. Ordem de Aprendizado DDD

1. **DDD Tatico primeiro.** Entities, Value Objects, Aggregates, Repositories. Codigo!
2. **DDD Estrategico depois.** Bounded Contexts, Context Map, Subdomains. Design!
3. **Arquitetura.** Hexagonal, Clean Architecture com DDD. Dependency Inversion.
4. **Integracao.** Domain Events, Integration Events, Saga, CQRS, Event Sourcing.
5. **Event Storming.** Workshops com especialistas de dominio.

## 2. Livros Essenciais

| Livro | Autor | Por que |
|-------|-------|--------|
| Domain-Driven Design (Blue Book) | Eric Evans | A Biblia. Original. Denso. |
| Implementing DDD (Red Book) | Vaughn Vernon | Pratico. Codigo Java/C#. |
| Domain-Driven Design Distilled | Vaughn Vernon | Resumo. Leia primeiro. |
| Patterns, Principles, and Practices of DDD | Scott Millett | C# pesado. Examples. |
| Learning Domain-Driven Design | Vlad Khononov | Moderno. 2021. Melhor intro atual. |
| Clean Architecture | Robert C. Martin | Complementar. Camadas. |
| Designing Data-Intensive Applications | Martin Kleppmann | Dados em sistemas DDD. |
| Team Topologies | Skelton/Pais | Organizacao de times = Bounded Contexts. |

## 3. Standards Relevantes para DDD

- **OpenAPI/Swagger:** documentar APIs entre Bounded Contexts (Open Host Service)
- **JSON Schema:** validar Integration Events
- **Protobuf/gRPC:** contratos entre contextos (Published Language)
- **AsyncAPI:** documentar eventos assincronos (Kafka)
- **SemVer:** versionar modelos de dominio e eventos

## 4. Open-Source que Usa DDD

- **Axon Framework (Java):** CQRS + Event Sourcing + DDD. Referencia.
- **Eventuous (.NET):** Event Sourcing + DDD para .NET
- **NestJS + CQRS:** modulo para CQRS em NestJS
- **pgdomain:** PostgreSQL com foco em DDD (schemas por bounded context)
- **EventStoreDB:** banco nativo para Event Sourcing

## 5. Comunidades e Referencias

- **DDD Brazil (Discord/Telegram):** comunidade BR ativa
- **Virtual DDD (Meetup):** encontros online globais
- **Explore DDD (conference):** USA
- **Domain-Driven Design Europe:** conference
- **dddheuristics.com:** heuristicas de design
