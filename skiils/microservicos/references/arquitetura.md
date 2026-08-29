# Arquitetura de Microsserviços — Referência Detalhada

## 1. 9 Melhores Práticas

### 1. Single Responsibility
Cada serviço tem UMA razão para mudar. Se o serviço de pedidos também gerencia notificações, está errado. Escopo bem definido = deploy independente.

### 2. Own Database
Cada serviço tem seu PRÓPRIO banco. Nada de compartilhar tabelas entre serviços.
```
✅ Users Service → users_db
✅ Orders Service → orders_db
❌ Users Service + Orders Service → shared_db
```
Data isolation permite deploy e schema evolution independentes. Dados compartilhados = via API, não via DB.

### 3. API First
Definir o contrato da API ANTES de implementar. OpenAPI/Swagger ou .proto. Times paralelos sabem o que esperar. Mock server para dev frontend enquanto backend é implementado.

### 4. Stateless
Estado no DB/cache, NUNCA em memória do serviço. Serviço stateless = qualquer instância atende qualquer requisição = escala horizontal trivial. Sessão → Redis, não sticky sessions.

### 5. CI/CD Pipeline Independente
Cada serviço tem seu pipeline. Deploy de users-service não bloqueia nem afeta orders-service. Sem "deploy orquestrado" entre serviços.

### 6. Observability
3 pilares: **Logs** (eventos, estruturados JSON), **Métricas** (latência, taxa de erro, throughput), **Tracing** (requisição cross-service com trace ID). OpenTelemetry é o padrão. Stack: Grafana + Prometheus + Loki + Tempo.

### 7. Resiliência
Assumir que TUDO falha. Circuit breaker (para de chamar serviço doente), retry com backoff (tentativas transitórias), timeout (não esperar infinitamente), bulkhead (isolar falhas). Ver `resiliencia.md`.

### 8. Service Discovery
Serviços precisam se encontrar dinamicamente. Opções:
- **DNS:** K8s Service (`users-service.namespace.svc.cluster.local`)
- **Consul:** health checks + DNS/HTTP API + key-value store
- **Eureka:** Netflix, client-side discovery, integrado com Spring Cloud

### 9. Configuration Management
Config externalizada, NUNCA hardcoded. 12-Factor App diz: config no environment. Ferramentas:
- **Spring Cloud Config:** server central + Git backend
- **Consul KV / Vault:** config + secrets dinâmicos
- **K8s ConfigMap/Secret:** nativo, simples

---

## 2. Monolith vs Microsserviços

### Monolith — Quando Usar
- Time pequeno (< 10 devs)
- Domínio simples ou em descoberta
- MVP, startup early-stage
- Performance importa (chamadas em processo > chamadas em rede)
- Exemplo: Stack Overflow roda em monolith até hoje (poucos servidores, milhões de usuários)

### Microsserviços — Quando Migrar
- Times múltiplos precisando deploy independente
- Partes do sistema com requisitos diferentes (escala, linguagem, DB)
- Deploy do monolith está travando a empresa
- **Conway's Law:** a arquitetura do software reflete a estrutura de comunicação da organização

### Custos Ocultos dos Microsserviços
- Latência de rede (cada chamada remota adiciona ms)
- Complexidade operacional (N serviços para monitorar, fazer deploy, debugar)
- Consistência eventual (não pode contar com transações cross-service)
- Debug difícil (stack trace cross-service)
- Duplicação de código (cada serviço tem seu boilerplate)

### Regra de Ouro
> Comece com monolith bem estruturado (modular). Extraia microsserviços quando a dor organizacional superar o custo técnico. Microsserviços resolvem problemas de ESCALA HUMANA, não técnica.

---

## 3. Netflix, Amazon, Uber

Os 3 migraram de monolith → microsserviços pelo mesmo motivo: **escala organizacional**.
- Times não conseguiam deployar sem coordenar com outros times
- Diferentes partes do sistema tinham requisitos diferentes
- O acoplamento no monolith impedia inovação rápida

**Netflix:** migrou em 7 anos. Começou com monolith Java → extraiu funcionalidades gradualmente. Hoje milhares de microsserviços.

**Amazon:** "mandato Bezos" (~2002): todos times devem se comunicar via APIs. Quem não fizer, está demitido. Isso forçou a arquitetura de serviços.

**Uber:** monolith Python → microsserviços. Hoje milhares de serviços. Cada serviço tem dono claro.

---

## 4. Comunicação entre Serviços

### Síncrona (Request-Response)
```
Users Service → HTTP/gRPC → Orders Service
```
- Simples, familiar
- **Problema:** cascading failures (se Orders falha, Users também pode falhar esperando)
- Use com circuit breaker + timeout + retry

### Assíncrona (Event-Driven)
```
Users Service → Evento "UserCreated" → Kafka → Orders Service, Email Service, Analytics
```
- Desacoplado, resiliente
- **Problema:** consistência eventual, complexidade de debug
- Padrões: Event Sourcing, CQRS, Saga

### Híbrido (o mais comum)
- Síncrono para operações críticas (criar pedido)
- Assíncrono para side effects (notificar, analisar, atualizar search)
