---
name: api-design
description: "Design de APIs REST, GraphQL, gRPC, HTTP, autenticação (OAuth 2.0, JWT), paginação, versionamento, rate limiting e API Gateway."
---

# Design de APIs

Cobre a teoria e prática de design de APIs: REST (princípios, métodos, códigos HTTP), GraphQL (schema, federation), gRPC (protobuf, streaming), autenticação (OAuth 2.0, JWT, sessions), e boas práticas de versionamento, paginação, rate limiting e performance.

## Quando usar

- Projetando uma nova API REST, GraphQL ou gRPC
- Escolhendo entre REST vs GraphQL vs gRPC para um caso de uso
- Implementando autenticação (OAuth 2.0 flows, JWT, API keys)
- Versionando APIs ou definindo estratégia de paginação
- Debugando problemas de performance em APIs
- Configurando API Gateway, rate limiting ou webhooks

## Fluxo

1. Identifique o tipo de API e a preocupação específica
2. Carregue a referência relevante em `references/` para detalhamento profundo
3. Considere as interseções: autenticação impacta design de endpoints, paginação impacta performance

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [rest-api.md](references/rest-api.md) | Princípios REST, HTTP methods, status codes, headers, HATEOAS, boas práticas de endpoints |
| [graphql.md](references/graphql.md) | Schema, resolvers, N+1 problem, dataloader, federation, subscriptions, quando usar |
| [grpc.md](references/grpc.md) | Protobuf, HTTP/2, 4 modos de streaming, deadlines, interceptors, REST vs gRPC |
| [autenticacao.md](references/autenticacao.md) | OAuth 2.0 flows, JWT estrutura e claims, sessions vs tokens, API keys, CORS |
| [boas-praticas.md](references/boas-praticas.md) | Versionamento, paginação (6 técnicas), rate limiting, error handling, filtros, performance |
