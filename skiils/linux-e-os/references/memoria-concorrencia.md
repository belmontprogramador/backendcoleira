# Memória, GC e Concorrência — Referência Detalhada

## 1. Hierarquia de Memória

| Nível | Latência | Capacidade | Persistente? |
|-------|----------|------------|-------------|
| **Registradores** | 0.3 ns | Bytes | Não |
| **L1 Cache** | 0.5 ns | 32-64 KB | Não |
| **L2 Cache** | 7 ns | 256-512 KB | Não |
| **L3 Cache** | 15 ns | 4-32 MB | Não |
| **RAM (DRAM)** | 100 ns | GB | Não |
| **NVMe SSD** | 150 µs | TB | Sim |
| **SATA SSD** | 500 µs | TB | Sim |
| **HDD** | 10 ms | TB | Sim |

### Por que isso importa
- Acesso L1: 0.5 ns. Acesso RAM: 100 ns. **200x mais lento.**
- Acesso disco: 150 µs (SSD) a 10 ms (HDD). **1000x a 100000x mais lento que RAM.**
- Otimização = manter dados o mais próximo possível da CPU

### Memória Virtual
- Cada processo vê seu próprio "espaço de endereçamento" (ilusão de RAM infinita)
- Páginas (4 KB): unidade de mapeamento RAM ↔ Disco
- **Swap:** páginas raramente usadas vão para disco (swap file/partition)
- Swap em uso excessivo = thrashing (sistema lento). Adicione RAM.

---

## 2. Garbage Collection

### Mark & Sweep (Clássico)
1. **Mark:** começa das raízes (globais, stack). Marca objetos alcançáveis.
2. **Sweep:** libera objetos não marcados.
- **Problema:** pausa para GC. Fragilidade: fragmentação de memória.
- Usado por: JavaScript (V8), Ruby (CRuby)

### Generational
- **Hipótese geracional:** maioria dos objetos morre jovem
- **Young Generation (Eden):** coleções frequentes, rápidas. Objetos sobreviventes → Old Gen
- **Old Generation (Tenured):** coleções raras, mais lentas
- Usado por: Java (G1, Parallel, ZGC), .NET, Python (ref counting + generational)

### Stop-the-World vs Concurrent
| Tipo | Como Funciona | Latência |
|------|---------------|----------|
| **Stop-the-world** | Pausa aplicação, GC roda, retoma | Pausas longas |
| **Concurrent** | GC roda em paralelo com app | Pausas curtas |
| **Incremental** | GC intercala com app em pequenos passos | Pausas muito curtas |

### GC por Linguagem

**Java:**
- **G1:** default. Generational + concurrent. Pausas previsíveis.
- **ZGC:** pausas < 1ms mesmo com TB de heap (Java 11+)
- Parâmetros: `-Xmx` (max heap), `-XX:+UseZGC`

**Go:**
- Concurrent mark-sweep. Foco em latência baixa, não throughput.
- `GOGC=100` (default): GC dispara quando heap dobra.

**Python:**
- Reference counting (imediato) + generational GC (cíclico)
- `gc` module para controlar

**JavaScript (V8):**
- Orinoco: concurrent marking + parallel scavenge
- Incremental marking para evitar pausas longas

### Quando GC Importa
- Microsserviços com timeout (pausa de GC = timeout = retry)
- Trading systems (latência previsível > throughput)
- Jogos (60 fps = 16 ms por frame. Pausa GC de 100 ms = 6 frames perdidos)

---

## 3. Concorrência vs Paralelismo

### Definições
- **Concorrência:** lidar com múltiplas tarefas. Intercalação em único core.
- **Paralelismo:** executar múltiplas tarefas. Múltiplos cores simultaneamente.
- Concorrência = ESTRUTURA do programa. Paralelismo = EXECUÇÃO em hardware.

### Analogia
- Concorrência: 1 caixa atendendo 3 filas (intercala)
- Paralelismo: 3 caixas atendendo 3 filas (simultâneo)
- Concorrência + Paralelismo: 3 caixas cada um atendendo 2 filas

---

## 4. Threads vs Processos

| | Processo | Thread |
|---|---------|--------|
| **Memória** | Espaço próprio | Compartilha com outras threads |
| **Comunicação** | IPC (pipes, sockets), lento | Memória compartilhada, rápido |
| **Criação** | Pesada | Leve |
| **Isolamento** | Total (crash não afeta outros) | Compartilhado (crash pode afetar) |
| **Context switch** | Caro | Barato |

### GIL (Global Interpreter Lock) — Python/Ruby
- Só 1 thread executa bytecode por vez
- GIL impede paralelismo real em Python (CPython)
- **Workaround Python:** multiprocessing (processos separados), async/await (I/O bound)

### Concorrência com Event Loop (JavaScript/Node.js)
- Single-threaded. Event loop gerencia I/O assíncrono.
- Callbacks, Promises, async/await.
- Bom para I/O bound. Ruim para CPU bound (bloqueia event loop).
