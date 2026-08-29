# Netflix — Arquitetura Real

## 1. API Architecture (4 Estagios)

Monolith -> Direct Access -> Gateway Aggregation -> Federated Gateway (GraphQL)
Comece simples, evolua a API layer conforme times crescem.

## 2. EVCache (Cache Distribuido Proprio)

**Lookaside Cache:** app -> EVCache -> miss -> Cassandra
**Transient Data Store:** sessao de playback efemera entre servicos
**Primary Store:** home page pre-computada toda noite, escrita DIRETO no cache
**High Volume Data:** UI strings, traducoes. Processo assincrono publica no cache

Licao: cache nao e so read-through. Pode ser storage PRIMARIO para dados pre-computados.

## 3. GraphQL Federation

Cada time mantem seu Domain Graph Service (DGS). Apollo Federation compoe supergraph.
Licao: GraphQL Federation resolve "quem agrega os dados?" em escala organizacional.

## 4. Streaming (CDN Proprio — Open Connect)

Streamer -> Encoder -> PoP -> Transcoder (multiplas resolucoes) -> Packager (HLS) -> CDN (OCA: Netflix bota servidores DENTRO dos ISPs!) -> Player com bitrate adaptativo.

## 5. Chaos Engineering

Chaos Monkey mata instancias aleatorias em PRODUCAO. Chaos Kong mata regiao inteira.
Melhor descobrir terca as 10h que quarta as 3h da manha.

## 6. Tech Stack
Java + Spring Boot. GraphQL DGS. EVCache (Memcached multi-TB). Cassandra. Open Connect CDN. Atlas/Mantis/Suro.
