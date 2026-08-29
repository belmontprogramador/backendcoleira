# GraphQL — Referência Detalhada

## 1. O Que é GraphQL?

Criado pelo Facebook em 2012 (aberto em 2015). É uma **query language para APIs** que permite ao cliente definir exatamente quais dados precisa — nem mais, nem menos.

### O Problema que GraphQL Resolve

**Over-fetching:** `GET /users/42` retorna 30 campos mas você só precisa do nome e avatar
**Under-fetching:** para renderizar uma tela você precisa chamar 5 endpoints diferentes (users, posts, comments, likes, shares)
**Waterfall requests:** chamadas encadeadas onde cada uma depende da anterior (N+1 no CLIENTE)

### Como GraphQL Resolve
```graphql
query {
  user(id: 42) {
    name
    avatar
    posts(last: 10) {
      title
      commentsCount
      likes { count }
    }
  }
}
```
**Um único request** → resposta exata, sem over-fetching, sem under-fetching.

---

## 2. Core Concepts

### Schema
- Define os tipos de dados e operações disponíveis
- Fortemente tipado — é a fonte da verdade e contrato entre cliente e servidor
```graphql
type User {
  id: ID!
  name: String!
  email: String
  posts: [Post!]!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
}
```

### Resolvers
- Funções que resolvem cada campo — podem vir de DBs diferentes
```javascript
const resolvers = {
  Query: {
    user: (_, { id }) => db.users.findById(id),
  },
  User: {
    posts: (user) => db.posts.findByUserId(user.id),
  },
};
```

### Operações
| Tipo | Descrição |
|------|-----------|
| **Query** | Leitura de dados |
| **Mutation** | Escrita/alteração |
| **Subscription** | Tempo real (WebSocket/SSE) |

---

## 3. O Problema N+1 e DataLoader

**O problema:**
```graphql
query {
  posts {        # 1 query (100 posts)
    author {     # 1 query POR POST = 100 queries
      name
    }
  }
}
# Total: 101 queries = PROBLEMA N+1
```

**Solução — DataLoader:**
- Agrupa requisições do mesmo tipo em UMA batch
- Funciona por tick do event loop
```javascript
const authorLoader = new DataLoader(async (ids) => {
  const authors = await db.users.findByIds(ids);
  return ids.map(id => authors.find(a => a.id === id));
});
// 100 IDs → 1 query: SELECT * FROM users WHERE id IN (...)
```
**DataLoader é obrigatório** em qualquer API GraphQL de produção.

---

## 4. GraphQL Federation

### Arquiteturas de Adoção

**1. Monolith GraphQL**
```
Client → Apollo Server (schema único, resolvers direto no DB)
```
Bom para times pequenos, POC, MVPs. Não escala organizacionalmente.

**2. Schema Stitching (manual)**
```
Client → Gateway → Service A (users) + Service B (posts) + Service C (comments)
```
Gateway manualmente combina schemas. Frágil: adicionar campo requer atualizar Gateway.

**3. Apollo Federation (declarativo)**
```
Client → Apollo Gateway (roteador inteligente)
            → Users Service (@key fields)
            → Posts Service (extend type User)
```
- Cada serviço declara seu sub-schema com `@key`, `@external`, `@requires`
- Gateway compõe automaticamente o supergraph
- Netflix usa isso em produção (DGS framework)

---

## 5. GraphQL vs REST — Quando Usar Cada

### GraphQL é melhor quando:
- Múltiplos clientes (web, iOS, Android, smartwatch)
- Dados interconectados (redes sociais, marketplaces)
- Times independentes (federation)
- Frontend precisa de flexibilidade sem esperar backend

### REST é melhor quando:
- API simples, CRUD sobre recursos independentes
- Caching é crítico (HTTP caching nativo)
- File upload/download
- Rate limiting e cost control são simples
- Times menores, stack mais simples

### Problemas do GraphQL
- Caching HTTP clássico não funciona (tudo via POST em `/graphql`)
- N+1 sem DataLoader = DB destruído
- Rate limiting complexo (1 query pode ser mais cara que 100 REST calls)
- File upload precisa de spec separada ou endpoint REST paralelo
- Erros parciais (HTTP 200 com `errors[]` no body)

---

## 6. Subscriptions — Tempo Real
```graphql
subscription {
  messageAdded(roomId: "general") {
    user { name }
    text
  }
}
```
Transportes: WebSocket (`graphql-ws`), SSE (Server-Sent Events), polling (fallback).

---

## 7. Ecossistema

| Ferramenta | Propósito |
|-----------|-----------|
| Apollo Server | Servidor GraphQL (Node.js) |
| Apollo Client | Cliente (React, Vue, Angular) |
| GraphQL Code Generator | Types/hooks automáticos do schema |
| Hasura | GraphQL automático sobre PostgreSQL |
| Prisma | ORM com suporte GraphQL |
| GraphQL Mesh | Gateway REST + gRPC + GraphQL |
| Apollo Router | Federation gateway (Rust, alta perf) |
