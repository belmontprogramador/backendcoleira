# Cloud FinOps e Disaster Recovery — Referencia Detalhada

## 1. Otimizacao de Custos

### Compute
- Right-sizing: recursos ajustados a carga real
- Reserved/Savings Plans: 1-3 anos compromisso -> 40-72% desconto
- Spot Instances: ate 90% off. Batch, CI/CD. Podem ser interrompidas
- Auto-scaling: nao pague por idle
- Graviton (ARM): 20% mais barato + 20% mais performatico

### Storage
- S3 lifecycle: Standard -> IA -> Glacier automatico
- Snapshots incrementais, deletar orfaos
- S3 Intelligent-Tiering: move automaticamente entre tiers

### Database
- Dev/staging desligados fora do horario
- Reserved instances
- Aurora Serverless v2: scale-to-zero

### Networking
- CDN reduz trafego para origin
- VPC Endpoints (S3, DynamoDB) sem custo de NAT Gateway
- Data transfer cross-AZ e cross-region custa caro

### Geral
- Tagging: CostCenter, Environment, Project -> atribuir custos
- Budgets + Alerts
- Limpeza: snapshots orfaos, IPs nao alocados, volumes detached, LBs idle

---

## 2. Disaster Recovery

### RTO e RPO
- RTO: tempo maximo para restaurar servico
- RPO: perda maxima de dados aceitavel (em tempo)

### 4 Estrategias

**Backup & Restore ($)**
Backup periodico -> restaura em desastre
RTO: horas/dias. RPO: horas. Sistemas nao-criticos.

**Pilot Light ($$)**
DB replicado, core minimo (desligado). Sobe em desastre.
RTO: min/horas. RPO: min. Sistemas importantes.

**Warm Standby ($$$)**
30% capacidade rodando. Escala para 100% em desastre.
RTO: minutos. RPO: seg/min. Sistemas criticos.

**Multi-Site Active/Active ($$$$)**
Ambas regioes ativas. Route 53 distribui. Falha -> 100% vai para sobrevivente.
RTO: segundos. RPO: 0. Missao-critica (pagamentos, saude).

---

## 3. Resiliencia Cloud-Native

### Multi-AZ
RDS Multi-AZ (replica sincrona, failover 1-2 min), ElastiCache, ELB cross-zone.

### Multi-Regiao
Route 53 failover, S3 Cross-Region Replication, DynamoDB Global Tables, Aurora Global Database.

### Chaos Engineering
Netflix Chaos Monkey, AWS Fault Injection Service, LitmusChaos/Chaos Mesh (K8s).
Teste falhas em producao controladamente.

---

## 4. Checklist de Prontidao
- Auto-scaling testado
- Backups automaticos com retencao
- Multi-AZ para DB e cache
- DR strategy documentada (RTO/RPO)
- Teste de restore de backup
- Game days / simulacoes
- Alertas de custo
- Infra como codigo versionado
- Runbooks para falhas
- Zero secrets hardcoded
