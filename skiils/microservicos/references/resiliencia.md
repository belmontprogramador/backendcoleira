# Resiliência em Microsserviços — Referência Detalhada

## 1. Circuit Breaker

### Máquina de Estados
```
CLOSED (normal)
  ↓ falhas consecutivas > threshold
OPEN (rejeita imediatamente)
  ↓ timeout (ex: 30s)
HALF-OPEN (permite 1 requisição teste)
  ↓ sucesso? → CLOSED
  ↓ falha? → OPEN (reset timer)
```

### Parâmetros
- **Failure threshold:** 5 falhas ou 50% em janela
- **Open timeout:** 30s a 5min (quanto tempo fica bloqueado)
- **Half-open requests:** 1-3 requisições de teste
- **Fallback:** o que retornar quando aberto? Cache, default, erro 503, degraded response

### Ferramentas
- **Resilience4j:** Java, funcional, para microsserviços
- **Polly:** .NET
- **Istio/Envoy:** circuit breaker no proxy (sem código)

---

## 2. Bulkhead

### O Problema
1 serviço com 100 threads. 1 endpoint problemático consome 90 threads. Outros 9 endpoints brigam por 10 threads. Serviço INTEIRO parece down.

### Solução
```
[Bulkhead Checkout: 10 threads] ──→ dependências
[Bulkhead Search: 5 threads]   ──→ dependências
[Bulkhead Reports: 3 threads]  ──→ dependências
```
Se search trava, checkout segue funcionando.
- **Thread pool isolation:** pool separado por operação
- **Semaphore isolation:** limita concorrência sem pool extra

---

## 3. Timeout

### Tipos
- **Connect timeout:** estabelecer TCP (1-3s)
- **Read timeout:** esperar resposta (5-30s)
- **Request timeout:** total (connect + read + process)

### Regra
`timeout = p99_latência_normal × 2` (ou ×3). NUNCA timeout infinito.

---

## 4. Retry com Backoff
Ver `mensageria.md`. Combinar circuit breaker + retry + timeout = pilha de resiliência completa.

---

## 5. Service Mesh

### O Que é
Camada de infraestrutura que gerencia comunicação entre serviços via sidecar proxies (Envoy).

```
[Service A] → [Envoy Proxy] ──mTLS──→ [Envoy Proxy] → [Service B]
```

### Funcionalidades
- **mTLS automático:** criptografia entre serviços sem código
- **Circuit breaker + retry + timeout** no proxy
- **Traffic splitting:** canary, A/B testing
- **Observabilidade:** métricas, tracing, logging automáticos
- **Fault injection:** testar resiliência (delay, abort)

### Opções
| Mesh | Destaque |
|------|----------|
| **Istio** | Mais completo, mais complexo |
| **Linkerd** | Mais leve, mais simples |
| **Consul Connect** | Integrado com service discovery |
| **Cilium** | eBPF-based, kernel-native |

### Quando Usar
- Muitos serviços (> 20) com comunicação complexa
- Precisa de mTLS em toda malha
- Precisa de observabilidade cross-service automática

### Quando NÃO Usar
- Poucos serviços (< 5)
- Complexidade extra não se justifica
- Biblioteca de resiliência (Resilience4j) resolve

---

## 6. Observabilidade

### 3 Pilares

**Logs:** eventos estruturados (JSON). `{"level":"error","msg":"payment failed","order_id":"99","trace_id":"abc123"}`. stdout/stderr. Centralizados: Loki, ELK, CloudWatch.

**Métricas:** números agregados. RED Method: Rate (req/s), Errors (taxa), Duration (p95). USE Method: Utilization, Saturation, Errors (para infra). Prometheus + Grafana.

**Tracing:** jornada de uma requisição cross-service. Cada serviço adiciona span com trace ID. Jaeger, Zipkin, Tempo, X-Ray.

### OpenTelemetry
Padrão CNCF. Unifica logs, métricas, tracing. Collector recebe telemetria → exporta para backends.

---

## 7. Pilha Completa de Resiliência

```
1. Timeout (não esperar infinitamente)
2. Retry com backoff + jitter (tentar de novo com esperteza)
3. Circuit breaker (parar de chamar serviço quebrado)
4. Bulkhead (isolar falhas)
5. Fallback (degradação graciosa)
6. Health checks (detectar e remover doentes)
7. Service mesh (ou bibliotecas) implementando isso
```
