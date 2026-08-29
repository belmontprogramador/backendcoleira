# Sharding de Banco de Dados — Referencia Detalhada

## 1. O Que e Sharding?

Sharding (fragmentacao) e dividir um banco de dados em pedacos menores e independentes (shards), cada um rodando em servidor separado. E a forma mais poderosa — e mais complexa — de escalar dados horizontalmente.

### Por que shardear?
- Dados nao cabem mais em um unico servidor (TB/PB)
- Single-writer nao aguenta mais o throughput de escritas
- Replicas resolvem reads, mas writes vao para o master
- Regulatorio: dados precisam residir em regioes especificas (LGPD/GDPR)

### Custo do Sharding
- Complexidade operacional (N bancos em vez de 1)
- Queries cross-shard sao caras ou impossiveis
- Joins entre shards precisam ser feitos na aplicacao
- Transacoes cross-shard (2PC, Saga) sao complexas
- Rebalanceamento pode causar downtime

---

## 2. Os 4 Algoritmos de Sharding

### 2.1 Range-Based (Por Faixa)
```
Shard A: user_id 1 a 1.000.000
Shard B: user_id 1.000.001 a 2.000.000
```
- **Vantagens:** simples, range scan eficiente, facil adicionar shard no final
- **Desvantagens:** hotspots (IDs recentes concentram trafego); distribuicao desigual
- **Exemplo real:** particionamento por data: `orders_2024_q1`, `orders_2024_q2`

### 2.2 Hash-Based
```
shard = hash(user_id) % numero_de_shards
```
- **Vantagens:** distribuicao uniforme, sem hotspots
- **Desvantagens:** resharding caro (recalcular hash = mover quase tudo); perde localidade
- **Exemplo real:** MongoDB hash-based sharding, DynamoDB hash key

### 2.3 Consistent Hashing
- Anel circular (0 a 2^64). Cada shard ocupa multiplos pontos (virtual nodes)
- Dados mapeados para shard mais proximo no sentido horario
- Adicionar shard: so dados entre o novo shard e o anterior migram
```
Antes:    [Shard A] ---- [Shard B] ---- [Shard C]
Adiciona: [Shard A] ---- [Shard D] ---- [Shard B] ---- [Shard C]
           ^ so dados entre A e D migram
```
- **Vantagens:** minimiza movimentacao; virtual nodes distribuem carga
- Usado por: DynamoDB, Cassandra, Riak, Discord

### 2.4 Directory-Based (Catalogo)
```
Tabela de lookup:
user_id: 42  -> Shard B
user_id: 99  -> Shard A
```
- **Vantagens:** flexibilidade total, mover dados individualmente
- **Desvantagens:** diretorio vira SPOF (precisa replicacao/cache); lookup adicional por query

---

## 3. Resharding (Refragmentacao)

### Quando
- Shard ficou muito grande (split)
- Hot partition (trafego desproporcional)
- Adicionar capacidade

### Estrategias
1. **Double-write:** escrever nos shards antigo e novo, migrar historico, cortar
2. **Read-replica como novo shard:** replica vira shard independente
3. **Consistent hashing:** so move fracao dos dados
4. **Planejamento:** superdimensionar shards para evitar resharding

---

## 4. Hot Partition — O Inimigo No 1

Uma particao com trafego desproporcional (ex: shard do Joao Influencer com 1000x mais seguidores).

### Solucoes
1. Melhor chave de shard (composite key que espalha)
2. Shard splitting manual
3. Rate limiting por shard
4. Caching agressivo (Redis na frente da hot partition)
5. Fan-out on write (Twitter: timeline de celebridade pre-calculada)

---

## 5. Sharding na Pratica

### Discord (Cassandra)
- Triloes de mensagens, sharding por guild_id
- Mensagens em time buckets dentro do guild
- Migraram de MongoDB -> Cassandra por performance de escrita

### Figma (PostgreSQL)
- Particionamento por projeto
- PG simples -> PgBouncer -> read replicas -> particionamento

### YouTube (Vitess/MySQL)
- Vitess gerencia sharding automatico por user_id + video_id
- Proxy traduz queries SQL para o shard correto
