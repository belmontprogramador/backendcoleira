# API REST — Referência Detalhada

## 1. Os 6 Princípios REST (Constraints de Roy Fielding)

REST não é um protocolo, é um **estilo arquitetural** definido por Roy Fielding em sua tese de doutorado (2000). Para uma API ser verdadeiramente RESTful, ela deve respeitar estas 6 constraints:

### 1.1 Client-Server (Cliente-Servidor)
- Separação de responsabilidades: cliente (UI/UX) e servidor (dados/lógica) evoluem independentemente
- O cliente não sabe como os dados são armazenados; o servidor não sabe como os dados são exibidos
- **Benefício:** portabilidade do cliente (web, mobile, desktop, IoT) e escalabilidade do servidor
- **Na prática:** frontend React e backend Java podem ser deployados e escalados separadamente

### 1.2 Stateless (Sem Estado)
- Cada requisição do cliente para o servidor deve conter TODA informação necessária para processá-la
- O servidor NÃO armazena estado da sessão do cliente entre requisições
- **Benefício:** escalabilidade (qualquer servidor atende qualquer requisição), confiabilidade (recuperação de falhas simples)
- **Custo:** cada requisição pode ser maior (tokens, contexto repetido)
- **Na prática:** tokens JWT enviados em cada requisição em vez de sessão server-side
- **Exceção:** estado pode ser mantido no CLIENTE (cookies, localStorage) e enviado em cada requisição

### 1.3 Cacheable (Cacheável)
- Respostas do servidor devem ser explícitas sobre sua cacheabilidade
- **Cache-Control:** `max-age` (cache por N segundos), `no-cache` (validar antes de usar), `no-store` (não cachear), `public` (CDN pode cachear), `private` (só browser)
- **ETag:** hash do conteúdo; cliente envia `If-None-Match` → servidor retorna `304 Not Modified`
- **Last-Modified:** timestamp; cliente envia `If-Modified-Since`
- **Benefício:** reduz latência, reduz carga no servidor, melhora experiência do usuário

### 1.4 Uniform Interface (Interface Uniforme)
- A base do REST. 4 sub-constraints:
  1. **Resource identification in requests:** recursos são identificados por URIs (`/users/42`, `/orders/99/items`)
  2. **Resource manipulation through representations:** o cliente tem uma representação (JSON/XML) do recurso e a envia de volta modificada
  3. **Self-descriptive messages:** cada mensagem contém toda informação para processá-la (Content-Type, links, métodos permitidos)
  4. **HATEOAS (Hypermedia as the Engine of Application State):** a resposta inclui links para ações possíveis
     ```json
     {
       "id": 42,
       "name": "João",
       "links": [
         {"rel": "self", "href": "/users/42"},
         {"rel": "orders", "href": "/users/42/orders"}
       ]
     }
     ```
  - HATEOAS é o constraint mais ignorado. GitHub API é um bom exemplo de HATEOAS parcial.

### 1.5 Layered System (Sistema em Camadas)
- O cliente não sabe se está falando diretamente com o servidor final ou com um intermediário
- Intermediários: load balancers, proxies, caches, API gateways
- **Benefício:** segurança (intermediários podem inspecionar tráfego), escalabilidade (adicionar camadas sem quebrar clientes)
- **Na prática:** API Gateway → microserviços é layered system puro

### 1.6 Code on Demand (Código Sob Demanda — OPCIONAL)
- Servidor pode enviar código executável para o cliente (ex: JavaScript)
- Único constraint opcional
- Exemplo: servidor envia script de validação de formulário que o cliente executa

---

## 2. Métodos HTTP — A Fundação do REST

### 2.1 Propriedades Fundamentais

**Idempotência:** executar N vezes = executar 1 vez
**Segurança (Safe):** não modifica o recurso no servidor

| Método | Seguro? | Idempotente? | Body? | Uso Principal |
|--------|---------|--------------|-------|---------------|
| GET | ✅ Sim | ✅ Sim | ❌ Não | Recuperar recurso(s) |
| HEAD | ✅ Sim | ✅ Sim | ❌ Não | Só cabeçalhos (validação) |
| OPTIONS | ✅ Sim | ✅ Sim | ❌ Não | Descobrir métodos disponíveis |
| PUT | ❌ Não | ✅ Sim | ✅ Sim | Substituir/criar recurso |
| DELETE | ❌ Não | ✅ Sim | ❌ Pode | Remover recurso |
| POST | ❌ Não | ❌ NÃO | ✅ Sim | Criar recurso, ação |
| PATCH | ❌ Não | ❌ NÃO | ✅ Sim | Modificação parcial |

### 2.2 Detalhamento por Método

**GET**
- Recupera representação de um recurso
- Pode ter query parameters para filtro/ordenação: `GET /users?role=admin&sort=name`
- Pode retornar coleção ou item único
- Cacheável (respeitando headers)
- **Boas práticas:** nunca modificar estado em GET (viola semântica e pode ser pré-buscado/cacheado causando efeitos colaterais)

**POST**
- Cria um novo recurso subordinado
- Não é idempotente: 2 POSTs = 2 recursos criados
- Retorna `201 Created` + header `Location: /users/42`
- Também usado para "ações" (RPC-style): `POST /users/42/reset-password`
- **Diferença POST vs PUT na criação:** POST deixa o servidor gerar o ID; PUT exige que o cliente defina o ID

**PUT**
- Substitui o recurso por completo (ou cria se não existir)
- **Semântica de substituição total:** o body do PUT DEVE ser o recurso completo
- Campos omitidos no PUT são removidos ou resetados para default
- Idempotente: PUT 10 vezes = recurso fica como na primeira vez

**PATCH**
- Aplica modificação PARCIAL no recurso
- Não é idempotente por definição (mas pode ser com formatos como JSON Patch)
- **JSON Merge Patch:** `{"email": "novo@email.com"}` — só atualiza o campo email
- **JSON Patch (RFC 6902):** `[{"op": "replace", "path": "/email", "value": "novo@email.com"}]`
- JSON Patch é idempotente (cada operação tem endereço exato)

**DELETE**
- Remove o recurso
- Idempotente: deletar algo já deletado = sucesso (ou `404 Not Found`)
- Retorna `200 OK` (com body) ou `204 No Content` (sem body)
- **Cascata:** deletar `/users/42` pode deletar `/users/42/orders` (decisão de design)

**HEAD**
- Igual ao GET mas sem body
- Útil para: verificar existência, checar headers (Content-Length, ETag, Last-Modified), validar cache
- Exemplo: cliente faz HEAD antes de GET para saber tamanho e decidir se baixa

**OPTIONS**
- Retorna métodos permitidos no header `Allow: GET, PUT, DELETE`
- Essencial para CORS preflight: browser faz OPTIONS antes de requisições cross-origin

---

## 3. Códigos de Status HTTP Que Você Precisa Saber

### 2xx — Sucesso
| Código | Nome | Quando usar |
|--------|------|-------------|
| **200 OK** | Sucesso genérico | GET, PUT, PATCH bem-sucedidos |
| **201 Created** | Recurso criado | POST bem-sucedido (com Location header) |
| **202 Accepted** | Aceito, processamento pendente | Operação assíncrona disparada |
| **204 No Content** | Sucesso sem body | DELETE bem-sucedido |

### 3xx — Redirecionamento
| Código | Nome | Quando usar |
|--------|------|-------------|
| **301 Moved Permanently** | URL mudou permanentemente | Migração de API (browsers atualizam bookmark) |
| **302 Found** | Redirecionamento temporário | Manutenção, A/B test |
| **304 Not Modified** | Usar cache | Resposta a `If-None-Match` / `If-Modified-Since` |

### 4xx — Erro do Cliente
| Código | Nome | Quando usar |
|--------|------|-------------|
| **400 Bad Request** | Requisição malformada | JSON inválido, campo faltando, validação |
| **401 Unauthorized** | Não autenticado | Token ausente ou expirado |
| **403 Forbidden** | Autenticado mas sem permissão | Role insuficiente |
| **404 Not Found** | Recurso não encontrado | ID inexistente |
| **405 Method Not Allowed** | Método não suportado | PUT em endpoint read-only |
| **409 Conflict** | Conflito de estado | Versão desatualizada, unique constraint |
| **422 Unprocessable Entity** | Erro semântico | Dados válidos mas incorretos (saldo insuficiente) |
| **429 Too Many Requests** | Rate limit excedido | Incluir header `Retry-After` |

### 5xx — Erro do Servidor
| Código | Nome | Quando usar |
|--------|------|-------------|
| **500 Internal Server Error** | Erro genérico | Exceção não tratada |
| **502 Bad Gateway** | Resposta inválida do upstream | API Gateway → serviço retornou inválido |
| **503 Service Unavailable** | Serviço temporariamente indisponível | Manutenção, sobrecarga (com Retry-After) |
| **504 Gateway Timeout** | Upstream não respondeu a tempo | Timeout entre API Gateway e serviço |

---

## 4. Design de Endpoints — Regras de Ouro

### 4.1 Nomeação
```
✅ BOM:  GET  /users              (coleção, plural)
✅ BOM:  GET  /users/42           (item específico)
✅ BOM:  GET  /users/42/orders    (sub-recurso)
✅ BOM:  POST /users              (criar na coleção)

❌ RUIM: GET  /getUsers           (verbo na URL)
❌ RUIM: GET  /getUserById?id=42  (verbo + query para identificação)
❌ RUIM: POST /users/create       (verbo + ação redundante)
```

### 4.2 Hierarquia de Recursos
- Máximo 2-3 níveis de aninhamento
- Recursos profundos devem ter seu próprio endpoint:
```
✅ GET /users/42/orders/99/items        (3 níveis, aceitável)
✅ GET /items?order_id=99               (alternativa achatada)
❌ GET /users/42/orders/99/items/5/taxes (5 níveis, ruim)
```

### 4.3 Verbos vs Substantivos
- Endpoints = substantivos (recursos)
- Métodos HTTP = verbos (ações)
- Para ações que não se encaixam em CRUD:
```
✅ POST /users/42/reset-password    (ação sobre recurso)
✅ POST /orders/99/cancel           (transição de estado)
❌ GET  /resetPassword?user_id=42   (verbo na URL, GET com side effect)
```

---

## 5. Content Negotiation e Versionamento de API

### Content Negotiation
- Cliente diz o que aceita: `Accept: application/json`
- Servidor diz o que está enviando: `Content-Type: application/json`
- Formatos comuns: `application/json`, `application/xml`, `application/x-www-form-urlencoded`
- `Accept-Version` ou `Accept: application/vnd.api+json;version=2`
- **Partial responses:** `GET /users?fields=id,name,email` (GraphQL-like em REST)

### Estratégias de Versionamento
| Estratégia | Exemplo | Prós | Contras |
|-----------|---------|------|---------|
| **URL path** | `/v1/users` | Mais simples, explícito | "Polui" URL, quebra REST purista |
| **Header** | `Accept-Version: v1` | URL limpa | Menos visível, caching complicado |
| **Query param** | `/users?version=1` | Fácil de testar | Polui URL, ignora caching |
| **Content-Type** | `Accept: application/vnd.myapp.v1+json` | REST purista | Complexo, difícil de testar |
| **Subdomain** | `v1.api.exemplo.com` | Separação total | Overhead de DNS/SSL |

**Na prática:** Path versioning (`/v1/`) é o mais adotado pela indústria (Stripe, GitHub, Twilio). Funciona.

---

## 6. HATEOAS na Prática

A maioria das APIs ditas "RESTful" não implementa HATEOAS. Mas quando implementado:

```json
// GET /users/42
{
  "id": 42,
  "name": "João Silva",
  "email": "joao@email.com",
  "_links": {
    "self": {"href": "/users/42"},
    "orders": {"href": "/users/42/orders"},
    "update": {"href": "/users/42", "method": "PUT"},
    "deactivate": {"href": "/users/42/deactivate", "method": "POST"},
    "avatar": {"href": "/users/42/avatar", "method": "PUT", "accept": "image/*"}
  }
}
```

**Benefícios:** cliente não precisa de URLs hardcoded; API pode evoluir sem quebrar clientes; documentação viva
**Custo:** mais bytes trafegados; cliente precisa ser mais inteligente; complexidade extra no servidor
**Formatos:** HAL, JSON:API, Siren, Collection+JSON

---

## 7. Filtros, Ordenação e Field Selection

```
GET /users?status=active&role=admin          (filtros)
GET /users?sort=-created_at,name             (ordenação; - = desc)
GET /users?q=joão                            (busca textual)
GET /users?fields=id,name,email              (sparse fieldsets)
GET /users?page=2&limit=20                   (paginação)
GET /users?include=orders,payments           (embed relacionados)
```

### Boas práticas:
- Use `?q=` para busca simples, endpoint `/search` para busca complexa
- `sort=-created_at` (menos = descendente) é padrão JSON:API
- `include` carrega relacionamentos (evita N+1 no cliente)
- Sempre documente quais filtros estão disponíveis em quais endpoints

---

## 8. API vs SDK — Qual a Diferença?

| API | SDK |
|-----|-----|
| Interface HTTP (REST/GraphQL/gRPC) | Biblioteca de código (Python, Java, JS) |
| Independente de linguagem | Específico para uma linguagem |
| Cliente faz chamadas HTTP | Cliente chama funções/métodos |
| Mais flexível | Mais produtivo (já tem auth, retry, serialização) |
| Exemplo: API do Stripe | Exemplo: stripe-python, stripe-node |

Stripe tem ambos: API REST + SDKs oficiais. É o padrão ouro.
