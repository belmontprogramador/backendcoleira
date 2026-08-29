# Tipos de Notas Fiscais Eletrônicas

> Fonte: [eNotas Blog — Tipos de Notas Fiscais](https://enotas.com.br/blog/tipos-de-notas-fiscais/)

## 1. NF-e — Nota Fiscal de Produto Eletrônica

- **Uso**: venda de produtos físicos (circulação de mercadorias)
- **Órgão**: SEFAZ estadual
- **Impostos**: ICMS, IPI
- **Documento físico**: DANFE (Documento Auxiliar da NF-e) acompanha transporte
- **Formato fiscal**: XML assinado digitalmente

## 2. NFS-e — Nota Fiscal de Serviço Eletrônica

- **Uso**: prestação de serviços
- **Órgão**: prefeitura municipal
- **Imposto principal**: ISS
- **Particularidade**: cada município tem regras e sistemas próprios
- **Exemplos**: oficinas, cursos online, faculdades, academias, SaaS

## 3. NFC-e — Nota Fiscal de Consumidor Eletrônica

- **Uso**: varejo (consumidor final)
- **Substitui**: cupom fiscal
- **Variações regionais**:
  - CF-e (Cupom Fiscal Eletrônico) — São Paulo, via SAT
  - MFE (Módulo Fiscal Eletrônico) — Ceará

## 4. CT-e — Conhecimento de Transporte Eletrônico

- **Uso**: prestação de serviço de transporte entre municípios
- **Emitente**: transportadora
- **Modal**: rodoviário, aéreo, ferroviário, aquaviário, dutoviário
- **Dados na nota**: remetente, destinatário, chave de acesso da NF-e, CFOP, NCM, valor

> ⚠️ Se o transporte for dentro do mesmo município → NFS-e

## 5. MDF-e — Manifesto de Documentos Fiscais Eletrônicos

- **Uso**: transporte interestadual de cargas
- **Agrega**: múltiplos CT-e e NF-e em um único manifesto
- **Obrigatório em**: SP, MS, PR (operações internas também)

## 6. Nota Fiscal Complementar

- **Uso**: corrigir quantidade ou valor de imposto inferior ao correto
- **Casos típicos**: reajuste de preço, erro de lançamento, variação cambial

## 7. Nota Fiscal Denegada

- **Motivo**: irregularidade fiscal do emitente ou destinatário
- **Importante**: numeração NÃO pode ser reaproveitada

---

## Para nosso backend

Os tipos relevantes são **NF-e** e **NFS-e** (já implementados como `PRODUTO` e `SERVICO`
no aggregate).

Os demais tipos (CT-e, MDF-e, NFC-e) são módulos separados no futuro — cada um com seu
próprio bounded context no DDD.
