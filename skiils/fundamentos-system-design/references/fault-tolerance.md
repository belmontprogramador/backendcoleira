# Fault Tolerance -- Referencia Detalhada

> "Everything fails, all the time." -- Werner Vogels, CTO Amazon

## 1. Mentalidade de Tolerancia a Falhas

Sistemas distribuidos falham. Nao e "se", e "quando". Rede cai, discos queimam, datacenters inundam, bugs causam crashes, latencia explode, humanos erram. Um sistema bem projetado assume falha como estado normal, nao como excecao.

### As 8 Falacias de Sistemas Distribuidos
1. The network is reliable -- Nao e.
2. Latency is zero -- Nao e. Round-trip EUA-Europa = ~100ms.
3. Bandwidth is infinite -- Nao e.
4. The network is secure -- Nao e.
5. Topology doesn't change -- Muda.
6. There is one administrator -- Multiplos times.
7. Transport cost is zero -- Serializacao custa CPU.
8. The network is homogeneous -- Nao e.

---

## 2. Padroes de Resiliencia

### 2.1 Redundancia
- Elimina Single Points of Failure (SPOFs)
- Tipos: hardware, rede, datacenter (AZs/regioes), dados (replicacao)
- Armadilha: redundancia sem isolamento = redundancia falsa (2 servidores no mesmo rack)

### 2.2 Circuit Breaker

O problema: Service A chama Service B. B fica lento. Threads de A bloqueiam esperando. A tambem falha. Cascata.

Maquina de estados:
```
CLOSED (normal)
  -> falhas consecutivas > threshold
OPEN (rejeita imediatamente)
  -> timeout (30s)
HALF-OPEN (permite 1 teste)
  -> sucesso? CLOSED | falha? OPEN
```

Parametros tipicos:
- Failure threshold: 5 falhas ou 50% em janela 10s
- Open timeout: 30s a 5min
- Half-open permit: 1-3 requisicoes
- Fallback: valor cacheado, erro 503, ou feature reduzida

Quando NAO usar: operacoes criticas nao-rejeitaveis (cobranca), chamadas idempotentes de baixa latencia (use retry)

### 2.3 Bulkhead -- Isolamento de Falhas

Metafora: navio com compartimentos estanques.

Problema: 1 endpoint problematico consome todas as threads -> servico inteiro parece down.

Implementacao:
- Thread pool por operacao (checkout: 10 threads, recomendacoes: 5 threads)
- Connection pool separado por servico
- Semaphore isolation (limita concorrencia sem thread extra)

Trade-off: mais pools = mais isolamento mas mais overhead

### 2.4 Retry com Backoff

Evolucao:
1. Fixed (ruim): 1s, 1s, 1s -> amplifica sobrecarga
2. Exponential (bom): 1s, 2s, 4s, 8s -> da tempo de recuperar
3. Exponential + Jitter (melhor): random ~1s, random ~2s, random ~4s, random ~8s

Jitter evita "thundering herd" -- multiplos clientes retentando no mesmo ms.

Regras de ouro:
1. So retry em erros transitorios (timeout, 503, connection refused)
2. NAO retry em erros definitivos (400, 401, 404)
3. Idempotencia e pre-requisito para retry seguro
4. Limite maximo de retries
5. Timeout total (soma dos backoffs)

### 2.5 Timeout

Sem timeout: threads acumulam, recursos esgotam, sistema morre.

Tipos:
- Connect timeout: estabelecer TCP (1-3s)
- Read timeout: esperar resposta (5-30s)
- Request timeout: tempo total

Como escolher: p99 da latencia normal x 2 ou x 3

### 2.6 Idempotencia

Definicao: f(x) N vezes = f(x) 1 vez

Crucial porque retries sao inevitaveis. Sem idempotencia, retry = duplicata.

Implementacao:
1. Idempotency Key (Stripe): UUID, header, servidor cacheia
2. PUT/DELETE naturais
3. DB unique constraint

Top 6 casos obrigatorios: REST API, pagamentos, pedidos, operacoes DB, contas usuario, mensageria

### 2.7 Graceful Degradation
- Quando algo falha, reduz funcionalidade mas core continua
- Identificar "caminho critico" vs "nice-to-haves"

### 2.8 Health Checks
- Liveness: processo rodando
- Readiness: pronto para trafego (dependencias OK)
- Startup: inicializacao concluida (apps lentos)
- Deep check: verifica dependencias reais (cuidado com cascata)

---

## 3. Deteccao de Falhas

### Heartbeat
No envia "estou vivo" a cada 1-10s. N falhas consecutivas = morto. Limitacao: binario, nao captura degradacao.

### Gossip Protocol
Nos trocam informacoes de estado (como fofoca). Descentralizado, escalavel. Ex: Cassandra, Consul, Dynamo.

### Phi-Accrual Failure Detector
Probabilidade de falha baseada no historico de heartbeats. Adapta-se a condicoes de rede. Phi=8 = ~0.0001% falso positivo. Usado por: Akka, Cassandra.

### SWIM Protocol
Ping direto + indireto + gossip. Eficiente e rapido. Usado por: Serf, Consul.

---

## 4. Recuperacao pos-Falha

1. Retry imediato (0-3x): erros obvios de rede
2. Retry com backoff (3-10x): sobrecarga temporaria
3. Dead Letter Queue: esgotou retries
4. DLQ Processing: investigar, corrigir, reprocessar

Garantias de entrega:
- At-most-once: pode perder, sem duplicata
- At-least-once: sem perda, pode duplicar (precisa idempotencia)
- Exactly-once: Kafka idempotent producer + transactions

---

## 5. Anti-Padroes

1. SPOF nao identificado
2. Timeout infinito
3. Retry sem backoff/jitter -> retry storm
4. Retry sem idempotencia -> duplicatas
5. Cascading failure (A->B->C, C falha -> todos)
6. Health check superficial
7. Falta de chaos engineering