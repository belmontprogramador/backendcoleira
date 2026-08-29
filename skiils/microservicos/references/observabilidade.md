# Observabilidade — Referencia Detalhada

## 1. Os 3 Pilares

Logs: eventos JSON estruturados. Metrics: numeros agregados (Prometheus). Tracing: jornada cross-service (OpenTelemetry).

## 2. OpenTelemetry

```typescript
const sdk = new NodeSDK({ traceExporter: new OTLPTraceExporter(), metricReader: ... });
sdk.start();
```
Span = unidade de trabalho. Trace = arvore de spans. Context propagation via headers.

## 3. Prometheus + Grafana

Metricas: counter (total), gauge (conexoes), histogram (p95).
RED Method: Rate (req/s), Errors (%), Duration (p95). USE Method: Utilization, Saturation, Errors (infra).

```promql
rate(http_errors[5m]) / rate(http_total[5m])  # taxa erro
histogram_quantile(0.95, http_duration_seconds)  # p95
```

## 4. SLOs, SLIs, Error Budgets

SLI = metrica. SLO = meta (p95 < 200ms). SLA = contrato (99.9%).
Error Budget = 100% - SLO = downtime permitido. Se estourou -> sem deploy arriscado.

## 5. Alertas

Alerta = accionavel + sem falsos positivos + tem runbook.

## 6. Logs Estruturados

```json
{"level":"error","msg":"payment failed","orderId":"abc","traceId":"xyz","duration_ms":150}
```
JSON -> Loki/ELK. Trace ID conecta log ao trace. NUNCA logar senhas/tokens.
