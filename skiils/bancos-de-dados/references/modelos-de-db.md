# Modelos de Banco de Dados — Referência Detalhada

## 1. SQL (Relacional)

Bancos relacionais existem há 50+ anos e continuam sendo a escolha padrão para a maioria das aplicações.

### Características Fundamentais
- **Schema rígido:** estrutura definida antes de inserir dados (tabelas, colunas, tipos)
- **ACID:** Atomicidade, Consistência, Isolamento, Durabilidade
- **SQL:** linguagem declarativa padronizada (portável entre bancos)
- **Joins:** relacionamentos entre tabelas resolvidos em tempo de query
- **Normalização:** eliminar redundância (1FN, 2FN, 3FN, BCNF)

### Principais SGBDs
| Banco | Destaque |
|-------|----------|
| **PostgreSQL** | O mais versátil: relacional + JSON + geoespacial + full-text + time-series + vetores |
| **MySQL/MariaDB** | Simples, rápido para reads, enorme adoção web (WordPress, Facebook) |
| **Oracle** | Enterprise, licenciamento caro, RAC (cluster), PL/SQL |
| **SQL Server** | Ecossistema Microsoft, T-SQL, integração .NET |

### Quando usar SQL
- Dados estruturados e relacionados (pedidos→itens→produtos→categorias)
- Transações financeiras (ACID é obrigatório)
- Relatórios complexos com joins e agregações
- Integridade referencial é crítica (foreign keys, constraints)

---

## 2. NoSQL — Os 6 Tipos

NoSQL surgiu para resolver limitações dos bancos relacionais em escala web: schemas flexíveis, escalabilidade horizontal, performance em casos específicos.

### 2.1 Key-Value (Chave-Valor)
```
GET usuario:42 → { "nome": "João", "email": "..." }
```
- **Como funciona:** hash table gigante e distribuída
- **Operações:** GET, SET, DEL, TTL, INCR (contadores atômicos)
- **Exemplos:** Redis, DynamoDB, etcd, Riak
- **Casos de uso:** cache, sessões, rate limiting, feature flags, filas leves
- **Redis é especial:** estruturas de dados ricas (lists, sets, hashes, sorted sets, streams, pub/sub)

### 2.2 Document (Documento)
```json
{
  "_id": "abc123",
  "nome": "João",
  "pedidos": [
    {"id": 1, "total": 150.00},
    {"id": 2, "total": 89.90}
  ]
}
```
- **Como funciona:** armazena documentos JSON/BSON autocontidos
- **Schema flexível:** documentos na mesma coleção podem ter estruturas diferentes
- **Exemplos:** MongoDB, Couchbase, Firestore, DynamoDB (também é documento)
- **Casos de uso:** catálogos, CMS, perfis de usuário, logs, IoT
- **Quando NÃO usar:** dados com muitos relacionamentos (joins são caros em MongoDB)

### 2.3 Column-Family (Família de Colunas)
```
usuario_42: {
  perfil: { nome: "João", email: "..." },
  metricas: { logins: 150, ultimo_login: "2024-01-01" },
  pedidos: { 1: 150.00, 2: 89.90 }
}
```
- **Como funciona:** linhas com colunas dinâmicas, agrupadas em famílias
- **Exemplos:** Cassandra, HBase, ScyllaDB
- **Casos de uso:** analytics, IoT massivo, time-series, messaging
- **Cassandra:** write-optimized, eventual consistency, CQL (SQL-like)

### 2.4 Graph (Grafo)
```
(João)-[:AMIGO_DE]->(Maria)-[:TRABALHA_EM]->(EmpresaX)
```
- **Como funciona:** nós (entidades) + arestas (relacionamentos) como cidadãos de primeira classe
- **Exemplos:** Neo4j, Amazon Neptune, ArangoDB
- **Casos de uso:** redes sociais, recomendações, detecção de fraude, grafos de conhecimento
- **Vantagem sobre SQL para grafos:** "amigos-de-amigos" é O(1) por aresta, não JOIN exponencial

### 2.5 Time-Series (Série Temporal)
```
cpu_usage{host="web01"} 2024-01-01T00:00:00Z 45.2
cpu_usage{host="web01"} 2024-01-01T00:01:00Z 67.8
```
- **Como funciona:** otimizado para escrita sequencial de timestamps + valores
- **Exemplos:** InfluxDB, TimescaleDB, Prometheus, ClickHouse
- **Casos de uso:** métricas, monitoramento, IoT, finanças (cotações)

### 2.6 Search (Busca)
- **Como funciona:** índice invertido (palavra → documentos que contêm)
- **Exemplos:** Elasticsearch, Solr, Meilisearch, Algolia
- **Casos de uso:** busca full-text, autocomplete, log analytics (ELK stack)

---

## 3. NewSQL — O Melhor dos Dois Mundos?

NewSQL tenta unir: ACID + SQL do modelo relacional + escalabilidade horizontal do NoSQL.

### Exemplos
| Banco | Abordagem |
|-------|-----------|
| **CockroachDB** | PostgreSQL wire-compatible, distribuição automática, sobrevivência multi-região |
| **TiDB** | MySQL-compatible, separa compute de storage, escala horizontal |
| **Google Spanner** | Globalmente distribuído, TrueTime (relógio atômico), SQL |
| **PlanetScale** | MySQL-compatible serverless, Vitess-based, schema branching |
| **YugabyteDB** | PostgreSQL-compatible, geo-distribuído |

### PostgreSQL Está Comendo o Mundo?
PostgreSQL se tornou um "canivete suíço" de bancos de dados:
- **Relacional:** tabelas, joins, constraints, triggers
- **JSON/JSONB:** indexado, com operadores SQL (tipo MongoDB dentro do PG)
- **Full-text search:** `tsvector`, `tsquery` — busca textual nativa
- **Geoespacial:** PostGIS (padrão ouro para GIS)
- **Time-series:** TimescaleDB (extensão, 10-100x mais rápido que PG puro)
- **Distribuído:** Citus (sharding horizontal), pg_partman (particionamento)
- **Vetores/AI:** pgvector (embeddings, similaridade — alternativa ao Pinecone)
- **Filas:** PgBoss, PGQueuer (job queue no próprio PG)
- **Columnar:** cstore_fdw, parquet_s3_fdw

**Lição:** Antes de adicionar complexidade com múltiplos bancos, pergunte-se: "o PostgreSQL resolve?"

---

## 4. Como Escolher o Banco Certo

### Framework de Decisão

1. **Dados são relacionais?** → SQL (PostgreSQL)
2. **Precisa de schema flexível?** → Document (MongoDB)
3. **Precisa de cache rápido?** → Key-Value (Redis)
4. **Relacionamentos complexos?** → Graph (Neo4j)
5. **Escrita massiva + time-series?** → Time-Series (TimescaleDB/InfluxDB)
6. **Busca textual?** → Search (Elasticsearch)
7. **Escala global + SQL?** → NewSQL (CockroachDB/Spanner)

### Regra de Ouro
> Comece com PostgreSQL. Migre partes específicas para NoSQL quando (e se) necessário. Um banco a menos = uma coisa a menos para operar, monitorar e debugar.

### Quando NÃO começar com PostgreSQL
- Você é o Discord armazenando trilhões de mensagens (Cassandra)
- Você é o Twitter com timeline em tempo real (Redis)
- Você é o Google com busca global (índice invertido proprietário)
