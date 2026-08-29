# Estruturas de Dados — Referencia Detalhada

## 1. 10 Estruturas Classicas

| Estrutura | Acesso | Busca | Inserir | Remover | Uso |
|-----------|--------|-------|---------|---------|-----|
| Array | O(1) | O(n) | O(n) | O(n) | Indexado |
| Linked List | O(n) | O(n) | O(1) | O(1) | Dinamico |
| Stack | O(1) top | O(n) | O(1) | O(1) | Undo, parsing |
| Queue | O(1) front | O(n) | O(1) | O(1) | BFS, tasks |
| Hash Table | — | O(1)* | O(1)* | O(1)* | Cache, indices |
| Tree | O(log n) | O(log n) | O(log n) | O(log n) | Hierarquia |
| Heap | O(1) min | O(n) | O(log n) | O(log n) | Priority Q |
| Graph | — | — | — | — | Redes, mapas |
| Trie | — | O(k) | O(k) | O(k) | Autocomplete |
| Bloom Filter | — | O(k) prob | O(k) | — | "Existe?" |

*medio. Pior caso O(n) com colisoes.

### Hash Table: colisoes por chaining ou open addressing. Load factor > 0.7 -> resize.

### Bloom Filter: k funcoes hash. Se todos bits = 1 -> "talvez". Se algum = 0 -> "nao". ~1 byte/item.

## 2. 8 Estruturas de DB

B-Tree (indice padrao), B+Tree (dados nas folhas, range scan), Hash Index (lookup exato), LSM Tree (write-optimized, Cassandra), Inverted Index (full-text, ES), Bitmap Index (baixa cardinalidade), R-Tree (geoespacial), Bloom Filter (evitar lookups).

### LSM Tree: escrita em RAM (memtable) -> flush sequencial (SSTable). Escrita SEMPRE sequencial = rapida.
