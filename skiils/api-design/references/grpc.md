# gRPC — Referência Detalhada

## 1. O Que é gRPC?

Framework RPC de alta performance criado pelo Google (aberto em 2015). Permite chamar métodos em servidor remoto como se fossem funções locais.

**Por que "Remote Procedure Call"?**
`userService.getUser(id)` parece chamada local, mas por baixo: serialização → HTTP/2 → rede → desserialização → execução → resposta.

**Por que foi criado?**
- JSON sobre REST é verboso (texto, campos repetidos, sem tipo forte)
- Microsserviços internos precisam de chamadas rápidas e tipadas
- Google precisava de algo mais eficiente para comunicação entre milhares de serviços

---

## 2. Protocol Buffers (Protobuf) — O Coração

### Por que binário é melhor que JSON?
| | JSON | Protobuf |
|---|------|----------|
| **Tamanho** | Texto (grande) | Binário (10-30x menor) |
| **Parsing** | Lento (parse string) | Rápido (offset binário) |
| **Schema** | Opcional | Obrigatório (geração de código) |
| **Evolução segura** | Frágil (renomear quebra) | Seguro (field numbers) |

### Exemplo .proto
```protobuf
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc ListUsers (ListUsersRequest) returns (stream User);      // server streaming
  rpc CreateUser (stream CreateUserRequest) returns (CreateUserResponse);  // client streaming
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);  // bidirectional
}

message GetUserRequest {
  int64 user_id = 1;
}

message GetUserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
}
```

**Field numbers** (`= 1`, `= 2`) são a chave da evolução segura. Pode renomear `name` para `full_name` sem quebrar nada — o número 2 continua sendo o campo 2.

---

## 3. HTTP/2 — Por que gRPC usa?

| Feature | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| Multiplexing | 1 req/conexão | Múltiplos reqs na mesma conexão |
| Header Compression | Não | HPACK |
| Server Push | Não | Sim |
| Binary Framing | Texto | Binário |
| Flow Control | Não | Sim (por stream) |

Na prática: dezenas de chamadas gRPC em UMA conexão TCP + headers comprimidos.

---

## 4. Os 4 Modos de Comunicação

### Unary RPC
```
Cliente → Request → Servidor → Response
```
Igual HTTP tradicional. Ex: `GetUser(userId)`.

### Server Streaming
```
Cliente → Request → Servidor → Stream (múltiplas msgs)
```
Servidor envia múltiplas respostas. Ex: `ListUsers(filter)` paginado.

### Client Streaming
```
Cliente → Stream (múltiplas msgs) → Servidor → Response
```
Ex: upload de arquivo grande em chunks, lote de inserts.

### Bidirectional Streaming
```
Cliente ⇄ Stream ⇄ Servidor
```
Ambos leem/escrevem simultaneamente. Ex: chat, multiplayer, trading.

---

## 5. Deadlines e Cancelamento

**Deadlines:** cliente define "quero resposta em até X ms". Deadline se propaga para serviços downstream. Se estourar, toda a chain para.

**Cancelamento:** cliente cancela → propaga automaticamente. Isso NÃO existe em REST (servidor continua processando mesmo após cancelamento do cliente).

---

## 6. Interceptors (Middleware gRPC)
```
Request → Interceptor 1 → Interceptor 2 → Handler → Interceptor 2 → Interceptor 1 → Response
```
Usos: logging, auth, métricas, tracing distribuído, rate limiting, retry.

---

## 7. gRPC vs REST — Guia de Decisão

| | REST | gRPC |
|---|------|------|
| **Formato** | JSON (texto) | Protobuf (binário) |
| **Performance** | Moderada | Alta (10x) |
| **Streaming** | SSE/WebSocket (workaround) | Nativo |
| **Navegador** | Excelente | Limitado (gRPC-Web) |
| **Debug** | Fácil (texto legível) | Difícil (binário) |
| **Caching** | Nativo (HTTP) | Precisa de camada extra |

**Use gRPC:** comunicação service-to-service, performance crítica, streaming, múltiplas linguagens.
**Use REST:** APIs públicas, navegador, debugging, caching HTTP.
**Híbrido:** gRPC internamente + API Gateway expõe REST externamente.
