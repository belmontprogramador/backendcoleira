# Uber — Monolith a Microservicos Domain-Oriented

## 1. A Migracao

Monolith Python (2011) -> Extracao por dominio (2013) -> Domain-Oriented Microservices (2017)
Mobility Domain: Trip, Pricing, Matching. Delivery Domain: Order, ETA, Dispatch.
Times sao donos de DOMINIOS, nao de servicos individuais.

## 2. Geospatial Indexing (H3)

Mundo dividido em hexagonos hierarquicos (H3, open-source da Uber).
Resolucao 0 = continentes. Resolucao 15 = 0.5 m2.
Buscar motoristas: hexagono do passageiro + vizinhos.
Por que hexagonos: sem dead zones, vizinhos equidistantes, hierarquico.

## 3. Precos Dinamicos (Surge)

demanda/oferta -> multiplier. Se > 1.0 = surge.
Sistema analisa hexagonos em tempo real.

## 4. Stack
Go, Java, Python. MySQL/PG, Cassandra, Redis, Kafka + Flink. H3. Multi-cloud (AWS+GCP).

## 5. Licoes
1. Extraia por DOMINIO, nao por entidade
2. Monolith primeiro. Valide o negocio antes de distribuir
3. Geospatial indexing e o core (H3 = diferencial)
4. Multi-cloud por resiliencia
