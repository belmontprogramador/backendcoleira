# Caching — Referência Detalhada

## 1. Onde cachear dados? (Top-down completo)

Dados são cacheados em **múltiplas camadas** da stack. Cada camada resolve um problema diferente de latência e escala.

### 1.1 Browser Cache (Client-side)
- Headers HTTP controlam o comportamento: `Cache-Control`, `ETag`, `Last-Modified`, `Expires`
- **Cache-Control: max-age=3600** — o browser reusa a resposta por 1h sem nem perguntar ao servidor
- **ETag/If-None-Match** — validação condicional: "aqui está meu hash, mudou?" → 304 Not Modified
- **Service Workers** — cache programável no browser (PWA offline-first)
- **Memory Cache vs Disk Cache** — o browser tem duas camadas internas: memory (rápido, volátil) e disk (persistente)

### 1.2 CDN (Content Delivery Network)
- Edge nodes espalhados globalmente (CloudFront, Cloudflare, Akamai, Fastly)
- Armazena assets estáticos: imagens, CSS, JS, vídeos, fontes
- **Modelo Pull:** CDN busca do origin na primeira requisição e cacheia nas edges
- **Modelo Push:** você faz upload pro CDN proativamente
- **Invalidação de cache:** purging via API, URLs versionadas (`estilos.v2.css`), cache-busting query strings
- **TTL estratégico:** assets que nunca mudam → TTL de 1 ano; HTML → TTL curto (ou no-cache)

### 1.3 Cache no Load Balancer
- LBs podem cachear respostas HTTP (apenas L7)
- Reduz carga no backend para conteúdo semi-estático
- Exemplo: Nginx pode servir arquivos estáticos direto do disco/memória sem tocar no app server

### 1.4 Message Brokers (Kafka, RabbitMQ)
- **Kafka retém mensagens em disco** por tempo configurável (retention policy)
- Não é "cache" tradicional, mas é armazenamento intermediário que desacopla produtor/consumidor
- **Page Cache do OS** — Kafka aproveita o cache de páginas do Linux para servir dados quentes da RAM sem leitura de disco
- **Tópicos compactados** — retém apenas a última versão de cada chave (cache de estado)

### 1.5 Cache de Serviço (In-Process)
- **CPU Cache:** L1 (0.5ns), L2 (7ns), L3 — controlado pela CPU, invisível ao código
- **Cache em Memória (aplicação):** Caffeine (Java), Node-Cache, Python lru_cache
  - Extremamente rápido (acesso em nanossegundos)
  - Limitado pela RAM disponível
  - Problema: cada instância tem seu próprio cache → inconsistência entre instâncias
- **Cache de Segundo Nível (disco local):** para dados que não cabem em RAM mas são maiores que latência de DB
  - RocksDB, SQLite, arquivos planos
  - Acesso em microssegundos (SSD) ou milissegundos (HDD)

### 1.6 Cache Distribuído (Redis, Memcached, Hazelcast)
- Cache compartilhado entre todas as instâncias do serviço
- **Redis:** estrutura de dados rica (strings, hashes, lists, sets, sorted sets, streams, geoespacial)
  - Single-threaded (atomicidade por comando), mas extremamente rápido
  - Persistência: RDB (snapshots) + AOF (append-only file)
  - Modo cluster: sharding automático com hash slots (16384 slots)
  - Sentinel: alta disponibilidade com failover automático
- **Memcached:** mais simples (key-value puro), multi-threaded, sem persistência
- **Hazelcast:** cache distribuído embedded na JVM (peer-to-peer, sem servidor externo)

### 1.7 Full-Text Search (Elasticsearch, Solr)
- Índice invertido para busca textual rápida
- Armazena cópia dos dados otimizada para busca
- Near-real-time (refresh interval de ~1s por padrão)
- Não é cache estrito, mas evita queries complexas no DB de origem

### 1.8 Caches de Banco de Dados (mais granular)
- **WAL (Write-Ahead Log):** dados escritos no log antes da B-tree — garante durabilidade e permite recuperação
- **Buffer Pool:** InnoDB (MySQL) e PostgreSQL alocam área de memória para cachear páginas de dados quentes
- **Materialized Views:** pré-computam queries caras e armazenam resultado como tabela
  - PostgreSQL: `CREATE MATERIALIZED VIEW ... AS SELECT ...` + `REFRESH MATERIALIZED VIEW`
- **Query Cache:** MySQL tinha; foi descontinuado na 8.0 porque causava contenção de lock
- **Replication Log:** binlog (MySQL), WAL shipping (PostgreSQL) — usado por réplicas para se manterem em sync

### Como garantir que dados sensíveis são completamente apagados?
- Browser cache: `Cache-Control: no-store` (não "no-cache", que ainda cacheia após validação)
- CDN: purging + não cachear endpoints sensíveis
- Redis: `DEL` ou `UNLINK` para remoção explícita; configurar TTL curto
- DB: caches internos (buffer pool) são voláteis; WAL rotate; criptografia em disco como camada extra

---

## 2. Os 4 Problemas Clássicos de Cache (Explicados a fundo)

### 2.1 Thunder Herd Problem (Stampede — Estouro da Manada)

**O que acontece:**
- Múltiplas keys de cache expiram exatamente no mesmo instante
- Uma enxurrada de requisições acerta o banco de dados simultaneamente
- O DB, que não foi dimensionado para receber 100% do tráfego, colapsa
- Exemplo real: centenas de objetos de uma página inicial expiram à meia-noite; todos os usuários que abrem o site às 00:00:01 batem no DB

**Por que dói tanto:**
- O cache existe justamente para absorver o tráfego. Quando ele falha em massa, você descobre que seu DB aguenta 1/10 da carga
- Efeito cascata: DB lento → timeouts no app → retries → mais carga no DB

**Soluções (da mais simples à mais robusta):**
1. **Jitter no TTL:** `TTL = ttl_base + random(0, ttl_base * 0.2)`. Simples e resolve 90% dos casos
2. **Recomputação antecipada probabilística:** antes da key expirar, uma pequena % de requisições já dispara o refresh
3. **Refresh externo:** um job assíncrono (cron, SQS) mantém as keys quentes, evitando que expirem no pico
4. **Lock/Mutex por key:** quando a key expira, apenas 1 worker recalcula; os outros esperam ou recebem valor stale
5. **Nunca expirar hot keys:** para keys que representam 80% do tráfego, configure TTL infinito e faça refresh programático

### 2.2 Cache Penetration (Penetração de Cache)

**O que acontece:**
- O cliente requisita uma key que **não existe no cache E não existe no banco de dados**
- Toda requisição para essa key vai direto para o DB, que confirma "não existe" repetidamente
- Exemplo real: atacante malicioso ou bug de frontend fazendo GET para `/users/999999999` (ID inexistente) milhares de vezes/segundo

**Por que dói:**
- Cada requisição consome recursos do DB (parse de query, lock, scan de índice) para retornar "não achei nada"
- O DB não tem como "se defender" sozinho; toda consulta é processada

**Soluções:**
1. **Cachear valores nulos:** por um TTL curto (30-60s), armazene "key X = null" no cache. O DB é atingido 1 vez por TTL, não por requisição
   - Cuidado: se houver MUITAS keys inexistentes diferentes, o cache pode encher de nulls
2. **Bloom Filter:** estrutura probabilística que responde "definitivamente não existe" ou "talvez exista"
   - Sem falsos negativos: se o bloom filter diz "não existe", pode confiar cegamente
   - Falsos positivos possíveis (~1-3%): se diz "talvez exista", ainda consulta o DB
   - Extremamente eficiente em memória: milhões de keys em poucos MB
3. **Rate limiting + validação de input:** validar formato, range, e rate-limit antes mesmo de checar cache

### 2.3 Cache Breakdown (Quebra de Hot Key)

**O que acontece:**
- Uma **hot key** (responsável por ~80% do tráfego) expira
- Diferente do thunder herd (muitas keys), aqui é **uma única key** que importa
- Quando ela expira, a avalanche de requisições derruba o DB
- Exemplo real: cache da home page do produto mais vendido; expira durante a Black Friday

**Por que é especialmente perigoso:**
- A hot key é a razão de existir do cache — sem ela, o sistema é projetado para falhar
- Pode ser difícil prever qual key vai ser "hot" (depende de eventos externos: lançamento, post viral, notícia)

**Soluções:**
1. **Não expirar hot keys:** TTL infinito para keys críticas. Atualização via eventos (CDC, pub/sub)
2. **Mutex/lock distribuído no refresh:** apenas 1 worker recalcula a hot key; outros usam valor stale temporário
   - Redis: `SET lock:key uuid NX EX 10` — apenas o worker que obtém o lock recalcula
3. **Cache multi-nível com fallback:** se L1 (Redis) falha, L2 (cache local) tem uma versão mais antiga mas funcional
4. **Aquecimento proativo:** job que monitora keys prestes a expirar e as reaquece antes da expiração

### 2.4 Cache Crash (Queda do Serviço de Cache)

**O que acontece:**
- Todo o cluster de cache (Redis, Memcached) fica indisponível
- 100% do tráfego é direcionado diretamente ao banco de dados
- O banco de dados, que foi dimensionado para 10-20% da carga, colapsa em segundos
- Causas: falha de rede, bug no Redis, esgotamento de memória, falha humana

**Soluções (em camadas):**
1. **Circuit Breaker:**
   - Monitora falhas no cache: se a taxa de erro passar de X% em Y segundos, ABRE o circuito
   - Com o circuito aberto, as requisições NEM TENTAM acessar o cache ou DB → falham rápido
   - Estados: Fechado (normal) → Aberto (corta tudo) → Semi-Aberto (testa periodicamente) → Fechado
   - Exemplos: Hystrix (Netflix), Resilience4j, Polly (.NET)

2. **Cluster de Cache com alta disponibilidade:**
   - Redis Sentinel: monitora masters, elege novo master em falha
   - Redis Cluster: sharding com replicação, tolera falha de N nós
   - AWS ElastiCache: multi-AZ com failover automático

3. **Degradação graciosa:**
   - Se o cache caiu, sirva conteúdo parcial/estático em vez de erro 500
   - Exemplo: e-commerce mostra catálogo sem personalização, Netflix mostra home page genérica

4. **Sobrecarga controlada no DB:**
   - Rate limiting no pool de conexões do DB
   - Read replicas dedicadas para absorver tráfego de fallback
   - Priorização: requisições de pagamento têm acesso ao DB; requisições de browsing não

5. **Cache local como último recurso:**
   - Se o cache distribuído caiu, use o cache em memória local (Caffeine/Node-Cache)
   - Dados podem estar stale, mas o sistema continua funcionando

---

## 3. Estratégias de Evicção — Detalhadas

### LRU (Least Recently Used — Menos Recentemente Usado)
- Remove o item acessado há mais tempo
- Implementação: lista duplamente encadeada + hash map → O(1) para get e put
- **Bom para:** workloads com localidade temporal (dado acessado recentemente tende a ser acessado de novo)
- **Ruim para:** scans sequenciais grandes que poluem o cache (um scan de toda tabela elimina todo seu cache quente)
- Exemplo: MySQL InnoDB buffer pool usa LRU com midpoint insertion (páginas novas entram no meio da lista, não no topo)

### MRU (Most Recently Used — Mais Recentemente Usado)
- Remove o item acessado mais recentemente
- **Bom para:** workloads onde o dado mais recente tem menor probabilidade de ser reusado
- Caso de uso: processamento de arquivos sequenciais (leu, processou, nunca mais volta)
- **Raramente usado** como estratégia principal; mais comum como otimização em casos específicos

### SLRU (Segmented LRU — LRU Segmentado)
- Dois segmentos: **probationary** (itens novos) e **protected** (itens re-acessados)
- Item novo entra no segmento probationary
- Se for acessado novamente, é promovido ao protected
- Protected usa LRU internamente; quando cheio, itens caem de volta ao probationary
- **Vantagem:** scans não poluem o cache protegido; só itens realmente quentes chegam lá

### LFU (Least Frequently Used — Menos Frequentemente Usado)
- Remove o item com menor contagem de acessos
- Implementação: min-heap ou listas de frequência
- **Bom para:** workloads com frequência de acesso previsível
- **Ruim para:** itens que eram muito populares no passado mas não são mais (poluição de cache) — precisa de decay
- Variação: **Window-LFU** (considera apenas acessos na última janela de tempo)

### FIFO (First In First Out — Primeiro a Entrar, Primeiro a Sair)
- Remove o item que está há mais tempo no cache, independente de acesso
- **Vantagem:** implementação trivial (fila)
- **Desvantagem:** pode remover itens quentes que estão lá desde o início
- **Quando usar:** quando simplicidade > eficiência, ou quando o padrão de acesso é totalmente aleatório

### TTL (Time-to-Live — Tempo de Vida)
- Cada item tem um tempo de vida pré-definido
- Pode ser absoluto (expira às 00:00) ou relativo (expira 1h após criação)
- **Combinação com LRU/LFU:** TTL define o tempo máximo, LRU/LFU remove antes se o cache encher
- **Estratégia de TTL por tipo de dado:**
  - Dados de usuário: 5-15 minutos (aceita certa defasagem)
  - Configurações: 1-24 horas (mudam pouco)
  - Rankings/populares: 1-5 minutos (mudam rápido)
  - Sessão: 30 min - 2 horas

### Two-Tiered Caching (Cache em Duas Camadas)
- **L1 (em memória, local):** Caffeine, Guava Cache, Node-Cache — acesso em nanossegundos
- **L2 (distribuído):** Redis, Memcached — acesso em microssegundos
- Fluxo: verifica L1 → miss → verifica L2 → miss → computa/armazena em L2 → armazena em L1
- **Invalidação:** pub/sub para notificar todas as instâncias quando um valor muda
- **Vantagem:** L1 absorve a maioria dos hits com latência mínima, L2 garante consistência entre instâncias

### Random Replacement (Substituição Aleatória)
- Remove um item aleatório quando precisa de espaço
- **Vantagens:** simples, sem overhead de tracking, impossível ter caso patológico
- **Desvantagens:** pode remover o item mais quente por azar
- **Curiosidade:** Estudos mostram que substituição aleatória tem performance surpreendentemente próxima de LRU em muitos workloads reais

---

## 4. Padrões de Cache que Você Precisa Conhecer

### Cache-Aside (Lazy Loading — Carregamento Preguiçoso)
```
app → cache → miss → DB → popular cache → retornar
```
- O padrão mais comum e simples
- App é responsável por manter o cache
- **Vantagem:** só cacheia o que é realmente usado
- **Desvantagem:** primeira requisição sempre é lenta (cold start); dados podem ficar stale

### Read-Through (Leitura Transparente)
```
app → cache → miss → cache consulta DB → popular → retornar
```
- O cache é responsável por buscar no DB
- App nunca fala diretamente com o DB para leitura
- **Vantagem:** simplifica o código da aplicação
- **Desvantagem:** primeira requisição ainda é lenta; acoplamento cache-DB

### Write-Through (Escrita Transparente)
```
app → cache → cache escreve no DB → confirma
```
- Toda escrita passa pelo cache antes do DB
- **Vantagem:** dados no cache sempre atualizados
- **Desvantagem:** latência de escrita aumentada (escreve em 2 lugares)

### Write-Behind (Write-Back — Escrita Assíncrona)
```
app → cache → confirma → (assíncrono) cache escreve no DB
```
- Escreve no cache, confirma rápido, DB é atualizado depois
- **Vantagem:** latência de escrita baixíssima
- **Desvantagem:** risco de perda de dados se o cache cair antes de persistir

### Refresh-Ahead (Atualização Antecipada)
```
cache detecta key prestes a expirar → refresh assíncrono → nova key pronta
```
- Cache proativamente reaquece keys antes da expiração
- **Vantagem:** elimina latência de cache-miss para hot keys
- **Desvantagem:** complexidade; pode aquecer dados que ninguém vai usar
