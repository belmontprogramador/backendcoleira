# Trade-offs Arquiteturais — Referência Detalhada

> "Tudo é um trade-off. Não existe design certo ou errado — apenas designs que otimizam para coisas diferentes."

## 1. Por que Trade-offs são a Essência de System Design

Em engenharia de software, raramente existe uma solução "melhor" universal. Toda decisão de arquitetura é uma **escolha do que sacrificar**. Entender isso diferencia um engenheiro júnior ("X é melhor que Y") de um sênior ("X é melhor que Y quando precisamos de A, mas pior quando precisamos de B").

**Exemplo universal:** Você não pode ter consistência forte, disponibilidade total e tolerância a partições de rede ao mesmo tempo (CAP). Algo cede. A pergunta certa não é "qual escolher?" mas sim "dado o meu contexto de negócio, qual sacrificar e como?"

---

## 2. Os 5 Trade-offs Clássicos

### 2.1 Custo vs Performance

**O dilema:**
- Performance custa dinheiro: mais servidores, instâncias maiores, regiões adicionais, CDN premium
- Você pode fazer QUALQUER sistema voar com dinheiro infinito. O desafio real é performance a custo razoável

**Onde isso aparece:**
- **Cache:** Redis no modo cluster ($$$) vs Redis single-node ($)
- **CDN:** Akamai enterprise ($$$$) vs CloudFlare tier gratuito
- **Banco de dados:** Aurora multi-master ($$$) vs PostgreSQL single-AZ ($)
- **Compute:** Lambda (pay-per-use, caro em escala) vs EC2 reserved (compromisso, mais barato)

**Como navegar:**
1. Dimensione o que é "bom o suficiente" — não otimize além do necessário
2. Identifique os 20% de funcionalidades que geram 80% do valor
3. Use tiers: caminho crítico rápido ($$$), resto aceitável ($)
4. Instâncias reservadas + spot instances para workloads flexíveis
5. Otimize software antes de jogar hardware — algoritmos melhores economizam mais que servidores maiores

### 2.2 Confiabilidade vs Escalabilidade

**O dilema:**
- Sistemas altamente confiáveis (5 noves = 99.999% uptime) são difíceis de escalar
- A complexidade de manter consistência, failover e zero-downtime em escala massiva é exponencial

**Onde isso aparece:**
- Bancos relacionais tradicionais são muito confiáveis mas difíceis de escalar horizontalmente
- NoSQL escala fácil mas sacrifica garantias de consistência (transações ACID, joins, constraints)
- Eleição de líder em sistemas distribuídos garante consistência mas limita throughput de escrita a um nó

**Como navegar:**
1. Defina SLOs realistas: você PRECISA de 99.999% ou 99.9% é aceitável?
2. Orçamento de erro: se você tem 99.9% SLO, pode ter 43 minutos de downtime por mês. Use isso.
3. CQRS: caminho de leitura escala horizontal (consistência eventual), caminho de escrita é confiável (consistência forte)
4. Não escale prematuramente — monolith + read replicas resolve até centenas de milhares de usuários

### 2.3 Performance vs Consistência

**O dilema:**
- Performance máxima exige relaxar consistência (consistência eventual, cache com defasagem)
- Consistência forte exige coordenação (locks, consenso distribuído) → latência

**Onde isso aparece:**
- Cache vs DB: cache tem dados stale, DB tem dados consistentes mas é mais lento
- NoSQL (DynamoDB eventual) vs SQL (PostgreSQL serializable)
- Replicação síncrona (consistente, lenta) vs assíncrona (rápida, risco de perda)
- Replicação baseada em líder (consistente, gargalo de escrita) vs multi-líder (rápido, conflitos)

**Como navegar:**
1. **Quão stale é aceitável?** Catálogo de produtos: 5 minutos. Saldo bancário: 0 segundos.
2. **Read-your-writes:** usuário deve ver suas próprias mudanças imediatamente, mesmo em sistema eventual
3. **Leituras monotônicas:** usuário nunca deve ver dados "voltarem no tempo"
4. Use o modelo certo para cada parte: carrinho de compras (consistente) + recomendações (eventual)

### 2.4 Segurança vs Flexibilidade

**O dilema:**
- Sistemas seguros têm barreiras, restrições, aprovações → menos flexibilidade
- Sistemas flexíveis têm menos travas → maior superfície de ataque

**Onde isso aparece:**
- Acesso ao banco de produção: livre (flexível, perigoso) vs acesso via bastion + aprovação (seguro, lento)
- Deploy: qualquer dev faz deploy (ágil, arriscado) vs pipeline com 4 aprovações + janela de mudança (seguro, burocrático)
- API pública: aberta (fácil integração, risco de abuso) vs autenticação obrigatória (fricção, segura)
- IAM: permissões granulares (seguro, complexo) vs roles amplos (simples, risco)

**Como navegar:**
1. Zero trust nas bordas, mais flexibilidade interna (service mesh com mTLS resolve muito)
2. Automatize segurança: SAST, DAST, image scanning no pipeline → segurança sem fricção manual
3. Gestão de segredos (Vault, KMS) → fácil acessar segredos de forma segura
4. Princípio do menor privilégio como padrão, com processo de escalação temporário

### 2.5 Velocidade de Desenvolvimento vs Qualidade

**O dilema:**
- Entregar rápido → atalhos técnicos, dívida técnica, bugs
- Qualidade alta → mais tempo em design, revisão, testes, documentação

**Onde isso aparece:**
- Startup early-stage: velocidade > qualidade (MVP precisa validar hipótese)
- Empresa estabelecida: qualidade > velocidade (bug em produção custa milhões)
- Todo projeto tem fases: inicial (velocidade), crescimento (equilíbrio), maduro (qualidade)

**Como navegar:**
1. Defina o que significa "qualidade" no contexto (não é 100% de coverage; é zero bugs em pagamentos)
2. Testes no caminho crítico, menos rigor no experimental
3. Feature flags: deploy código inativo → testa em produção com % pequena → ativação segura
4. Dívida técnica consciente: "vamos fazer rápido agora E documentar o que precisa ser refeito depois"

---

## 3. Ferramentas para Pensar em Trade-offs

### Análise de Requisitos Não-Funcionais
Antes de qualquer decisão de arquitetura, ranqueie por prioridade:
1. Disponibilidade (qual downtime é aceitável?)
2. Consistência (dados stale são aceitáveis? por quanto tempo?)
3. Latência (qual o p95 aceitável?)
4. Throughput (quantas requisições/segundo?)
5. Custo (qual o orçamento mensal?)
6. Tempo de desenvolvimento (deadline?)

**Exemplo — App de pagamentos:**
Consistência > Disponibilidade > Latência > Custo > Throughput

**Exemplo — Rede social:**
Disponibilidade > Throughput > Latência > Consistência > Custo

### ADR (Registro de Decisão de Arquitetura)
Documente toda decisão de trade-off:
```markdown
# ADR-001: Usar PostgreSQL em vez de DynamoDB para pedidos

## Contexto
Precisamos de transações ACID para processamento de pedidos.

## Decisão
PostgreSQL com read replicas.

## Consequências
- ✅ Transações fortes, joins, constraints
- ❌ Escala vertical primária; sharding manual se crescimento explodir
- ❌ Custo de operação maior que DynamoDB serverless
```

### Checklist para Decisões
- [ ] Quais são as alternativas reais?
- [ ] O que cada alternativa sacrifica?
- [ ] O sacrifício é aceitável para o negócio HOJE?
- [ ] Dá para reverter a decisão no futuro? (reversibilidade)
- [ ] Quanto custa reverter? (porta de duas mãos vs porta de uma mão)
