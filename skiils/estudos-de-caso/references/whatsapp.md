# WhatsApp — Erlang e Milhões de Conexões por Servidor

## 1. O Contexto

WhatsApp foi adquirido pelo Facebook em 2014 por US$ 19 bilhões. Na época, apenas 35 engenheiros serviam 450 milhões de usuários.

**O assustador:** 35 engenheiros. 450M usuários. Zero downtime.

---

## 2. Erlang — A Escolha Não-Óbvia

### Por que Erlang?
- Criado pela Ericsson nos anos 80 para sistemas de telefonia
- Projetado para: concorrência massiva, hot-code swapping (deploy sem downtime), tolerância a falhas
- **Actor model:** cada conexão = um processo Erlang leve (~300 bytes de overhead)
- **Preemptive scheduling:** um processo pesado não bloqueia outros

### Concorrência: Erlang vs Tradicional
```
Thread tradicional: 1 thread OS = 1 conexão = ~1MB overhead = 1000 conexões/GB
Erlang process: 1 processo = 1 conexão = ~300 bytes = 3M conexões/GB
```
WhatsApp conseguia **milhões de conexões TCP ativas por servidor.** Isso é IMPOSSÍVEL com thread-per-connection (Java, Python, C++ threads).

---

## 3. Arquitetura

### XMPP (Extensible Messaging and Presence Protocol)
WhatsApp usava XMPP modificado para mensageria em tempo real.

```
[Client App] ←──TCP/TLS──→ [YAWS/Cowboy (HTTP/XMPP server)]
                                  ↓
                           [Erlang Node: message routing, presence, groups]
                                  ↓
                           [Mnesia DB (Erlang embedded)]
                                  ↓
                           [FreeBSD (OS)]
```

### Mnesia DB
- Banco de dados embutido no Erlang
- Distribuído, soft real-time
- Armazenava: mensagens offline, fila de entrega, estado de presença
- Para dados que não cabiam em Mnesia → sharding horizontal + particionamento

---

## 4. Hot Code Swapping

Erlang permite trocar CÓDIGO em produção sem reiniciar o servidor.

```
Versão antiga do módulo de roteamento rodando
Nova versão é carregada no runtime
Conexões novas usam versão nova
Conexões existentes terminam na versão antiga
ZERO downtime. ZERO conexões perdidas.
```

Isso permitia ao time de 35 engenheiros deployar múltiplas vezes ao dia sem que 450M de usuários percebessem.

---

## 5. Por que Funcionou com 35 Engenheiros?

1. **Erlang resolve concorrência no runtime.** Você não programa threads, locks, deadlocks.
2. **Let it crash.** Filosofia Erlang: se um processo falha, outro assume. Não tenta prever todo erro.
3. **Supervision trees.** Processos são organizados em árvores com supervisores que reiniciam filhos.
4. **Sem middlewares.** Erlang + Mnesia + FreeBSD. Stack mínima.
5. **Foco no essencial.** WhatsApp era só mensagens. Sem feed, sem stories, sem algoritmos.

---

## 6. Lições

1. **Linguagem IMPORTA.** Erlang não era hype. Era a ferramenta certa para mensageria massiva.
2. **Actor model é superior a threads para I/O massivo.** Cada conexão = um processo leve.
3. **Hot code swapping permite deploy contínuo real.** Zero downtime, zero conexões perdidas.
4. **Stack mínima, time pequeno.** 35 engenheiros para 450M usuários. Menos código = menos bugs.
5. **"Let it crash" é uma filosofia de design.** Assuma que tudo falha. Projete para recuperar, não para prevenir.

---

## 7. Stack (WhatsApp Clássico, 2014)
- **Linguagem:** Erlang
- **Servidor HTTP/XMPP:** YAWS, depois Cowboy
- **DB:** Mnesia (embedded), depois particionamento horizontal
- **OS:** FreeBSD
- **Protocolo:** XMPP modificado (func over TCP)
