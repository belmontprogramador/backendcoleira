# Discord — Como Armazenam Trilhões de Mensagens

## 1. O Problema

Discord processa **bilhões de mensagens por dia**. Em 2023, o sistema acumulava **trilhões de mensagens históricas**. Tudo com latência baixíssima (usuário espera ms, não segundos).

---

## 2. A Migração: MongoDB → Cassandra

### Começaram com MongoDB
- Simples, schema flexível. Ótimo para start.
- **Problema:** MongoDB não escala escritas massivas bem. Discord é write-heavy (toda mensagem é uma escrita).

### Migraram para Cassandra
- Write-optimized. Append-only internals (LSM tree).
- Escrita sequencial em disco = rápido.
- Sem single point of failure. Multi-region nativo.

**A migração foi feita sem downtime.** Double-write: escreviam em MongoDB e Cassandra simultaneamente, migraram dados históricos em background, cortaram MongoDB.

---

## 3. Sharding Strategy

### Guild ID como Chave de Shard
```
guild_id = "abc-123" → hash("abc-123") → Shard B
```
- Cada servidor Discord (guild) tem seu próprio shard
- Mensagens de um guild ficam JUNTAS (queries são sempre dentro de um guild)
- **Isso é crucial:** queries cross-shard são caras. Discord nunca precisa fazer JOIN entre guilds.

### Time Buckets
```
Mensagens do guild "abc-123":
  bucket_2025_06_25: [msg1, msg2, msg3...]
  bucket_2025_06_24: [msg4, msg5...]
```
Mensagens dentro do guild são organizadas em buckets de tempo. Buscar "últimas 50 mensagens" = 1-2 buckets.

---

## 4. Read Path (Cache Agressivo)

As mensagens mais recentes de cada canal estão SEMPRE em cache (Redis/memory). 99% das leituras são de mensagens recentes.

```
Read Request → Redis (hot messages) → HIT (99%)
                                     → MISS → Cassandra (cold messages)
```
Mensagens antigas (> 7 dias) vão para Cassandra diretamente. Latência maior, mas raramente acessadas.

---

## 5. Mídia (Imagens, Vídeos, Áudio)

```
Upload → Process (resize, transcode) → CDN (Cloudflare/CloudFront)
                                         ↓
                                    Metadata → Cassandra
```
Mídia NUNCA vai para o Cassandra. Só metadata (URL, dimensões, tipo). Arquivos vão para object storage (S3) + CDN.

---

## 6. Lições

1. **Escolha o DB certo para o workload.** MongoDB era ótimo para start. Cassandra é ótimo para escala.
2. **Shard por padrão de acesso.** Guild ID é a chave natural. Toda query é dentro de um guild.
3. **Cache o que é quente.** 99% de hits no Redis. Cassandra só para cold storage.
4. **Migração de DB sem downtime é possível.** Double-write + backfill + cutover.
5. **Mídia não vai no DB.** Metadata sim. Arquivos → S3 + CDN.

---

## 7. Stack
- **Backend:** Python (original), Rust (novos serviços)
- **DB:** Cassandra (mensagens), PostgreSQL (metadados)
- **Cache:** Redis
- **Mídia:** S3 + Cloudflare CDN
- **Mensageria:** Kafka
