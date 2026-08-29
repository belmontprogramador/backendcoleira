---
name: giss-online
description: >
  Emissão de NFS-e via sistemas municipais GissOnline. Use quando precisar de
  conhecimento sobre integração com prefeituras, retenções de ISS, diferenças
  NF-e/NFS-e, ou modelagem de tributação de serviços no domínio fiscal.
user-invocable: true
---

# GissOnline — Emissão de NFS-e Municipal

Skill de domínio fiscal: o que é o GissOnline, como ele se relaciona com NFS-e, e como
modelar a integração no backend DDD de Nota Fiscal.

---

## 1. O que é GissOnline

GissOnline é um **sistema de escrituração eletrônica municipal** usado por diversas
prefeituras brasileiras para gestão do **ISSQN (Imposto Sobre Serviços de Qualquer
Natureza)**.

Responsabilidades do sistema:

- **Emissão de NFS-e** — portal web para emitir notas fiscais de serviço
- **Escrituração automática** — vincula cada nota ao livro fiscal eletrônico da empresa
- **Declaração mensal** — exige que empresas declarem serviços prestados *e* tomados
- **Controle de retenção na fonte** — evita perda de arrecadação via substituição tributária
- **AIDF/NFS-e** — autorização para impressão de documentos fiscais (onde aplicável)

> **Obrigatoriedade**: regulamentada por Decreto ou Lei municipal. Todos os prestadores
> e tomadores de serviço (pessoas jurídicas ou equiparadas) sediados no município devem
> usar. Também vale para contribuintes de fora cujo imposto é devido no local da prestação.

---

## 2. Fluxo de Emissão

### 2.1 Acesso e Credenciamento

1. Acessar o portal da prefeitura (cada município tem URL própria)
2. Solicitar liberação no ambiente do provedor GissOnline
3. Aguardar validação pelo departamento de fiscalização tributária
4. Receber usuário e senha para o ambiente de emissão

### 2.2 Emissão da NFS-e

1. Login no portal da prefeitura
2. Preencher dados do serviço (código LC 116, valor, tomador, discriminação)
3. Sistema calcula automaticamente o ISS devido
4. Emissão gera a NFS-e com numeração e chave de acesso
5. Dados integram automaticamente ao livro fiscal eletrônico

### 2.3 Integração com GINFES

Em cidades que usam o **GINFES** (Ambiente de Gestão Inteligente da NFS-e), o
GissOnline integra automaticamente — sem necessidade de duplo cadastro.

---

## 3. Cenários de Integração por API

Três abordagens para automatizar emissão contra o GissOnline:

| Abordagem | Descrição | Complexidade |
|---|---|---|
| **Portal web manual** | Usuário acessa site da prefeitura e preenche | Nenhuma (baixo volume) |
| **API REST/SOAP da prefeitura** | Prefeitura expõe webservice para envio de lote | Alta (varia por cidade) |
| **Gateway fiscal terceiro** | eNotas, Tecnospeed etc. abstraem a integração | Média (API única → N prefeituras) |

### 3.1 Abordagem recomendada para o backend

Usar o padrão **Port/Adapter (DIP)**:

```
domain/
  ports/
    emissao-nfse.port.ts          ← interface (não sabe de GissOnline)

infrastructure/
  adapters/
    giss-online/
      giss-online.adapter.ts      ← implementa EmissaoNfsePort
      giss-online.auth.ts         ← gerencia token/sessão
      giss-online.client.ts       ← HTTP/SOAP client
```

Benefícios:
- Trocar prefeitura = trocar adapter, domínio intacto
- Adicionar gateway fiscal = novo adapter, mesma porta
- Testável com mock do port

---

## 4. NF-e vs NFS-e (Referência Rápida)

| Aspecto | NF-e (Produto) | NFS-e (Serviço) |
|---|---|---|
| **Escopo** | Circulação de mercadorias | Prestação de serviços |
| **Órgão** | SEFAZ estadual | Prefeitura municipal |
| **Imposto principal** | ICMS, IPI | ISS |
| **Padrão nacional** | Sim (leiaute NF-e único) | Não (cada cidade decide) |
| **Certificado digital** | Obrigatório (A1/A3) | Depende da prefeitura |
| **Código fiscal** | CFOP | Código de Serviço (LC 116) |
| **Retenções** | ICMS-ST | ISS, PIS, COFINS, IRRF, INSS |
| **Portal nacional** | Sim (NF-e) | Sim (NFS-e Nacional — MEI + adesão voluntária) |
| **Volume de integrações** | 27 SEFAZ estaduais | 5.570 prefeituras |

---

## 5. ISS e Retenções

### 5.1 Alíquotas

- **Municipal**: cada prefeitura define (tipicamente 2% a 5%)
- **Local de incidência**: local do estabelecimento prestador (regra geral) ou local da
  prestação (exceções — construção civil, limpeza, vigilância etc.)

### 5.2 Retenções na Fonte (Substituição Tributária)

Quando o tomador do serviço retém o ISS e recolhe diretamente:

- **PIS/COFINS**: retenção de 4,65% (regime cumulativo) ou 9,25% (não-cumulativo)
- **IRRF**: alíquotas variáveis conforme natureza do serviço (1,5% a 4,8%)
- **INSS**: 11% sobre mão de obra (cessão de mão de obra, empreitada)
- **ISS**: retido pelo tomador quando este é responsável tributário no município

### 5.3 Código de Serviço (LC 116/2003)

Lista anexa da Lei Complementar 116 define os códigos oficiais. Exemplos:

| Código | Descrição |
|---|---|
| 01.01 | Análise e desenvolvimento de sistemas |
| 01.02 | Programação |
| 01.03 | Processamento de dados |
| 01.04 | Elaboração de programas de computadores |
| 01.05 | Licenciamento de programas de computador |
| 06.01 | Serviços de engenharia |
| 07.01 | Serviços de arquitetura |

---

## 6. Mapeamento para o Backend (DDD)

Nosso módulo `nota-fiscal` já modela os dados fiscais de NFS-e. A integração com
GissOnline adiciona a camada de **envio externo**:

```
┌─────────────────────────────────────────────────┐
│  HTTP POST /api/notas-fiscais                    │
│  { tipo: 'SERVICO', tributacao: { iss, ... } }  │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Application Layer                               │
│  EmitirNotaUseCase                               │
│  └─> NotaFiscal.rascunhoServico(...)             │
│  └─> nota.emitir()                               │
│  └─> repository.save(nota)                       │
│  └─> emissaoPort.enviar(nota)  ← NOVO           │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  Infrastructure                                  │
│  GissOnlineAdapter                               │
│  └─> traduz NotaFiscal → payload prefeitura      │
│  └─> envia HTTP/SOAP                             │
│  └─> retorna ProtocoloEmissao { numero, serie }  │
└─────────────────────────────────────────────────┘
```

### 6.1 Aggregate → Payload

O adapter lê os VOs do aggregate e monta o payload esperado pela prefeitura:

```
NotaFiscal.tipo          → (dispatch)
NotaFiscal.tributacao    → TributacaoServico
  ├── codigoServico      → Código LC 116
  ├── iss                → aliquota, valor, baseCalculo
  ├── pis/cofins         → com retidoNaFonte
  ├── irrf/inss          → com retido
  └── discriminacao      → descrição do serviço
NotaFiscal.items         → discriminação detalhada
NotaFiscal.emitente      → CNPJ prestador
NotaFiscal.destinatario  → CNPJ tomador
NotaFiscal.valorTotal    → valor do serviço
```

### 6.2 Status pós-envio

```
RASCUNHO  ──emitir()──▶  EMITIDA  ──enviar()──▶  AUTORIZADA
                            │                         │
                            └─── rejeição ──────▶  REJEITADA
                            │
                            └─── cancelamento ──▶  CANCELADA
```

---

## 7. Dicas Práticas

### 7.1 Alterar dados cadastrais no GissOnline

- Acessar "Contato" → "Opções de atendimento"
- Alterar dados necessários
- Salvar

### 7.2 Cancelamento de NFS-e

- Feito pelo portal da prefeitura (guia "Cancelamento de NFS")
- Prazo e regras **variam por município** (algumas permitem 24h, outras não permitem)
- Pode ser autorizado ou rejeitado pela prefeitura

### 7.3 Cuidados

- Cada prefeitura tem **autonomia total** sobre regras, prazos e exigências
- **Certificado digital**: algumas prefeituras exigem, outras não. Simples Nacional pode
  emitir sem certificado em várias cidades (ex: São Paulo, São Bernardo do Campo)
- **RPS (Recibo Provisório de Serviços)**: usado como contingência quando o sistema da
  prefeitura está indisponível

---

## 8. Referências Externas

- [eNotas Blog — Notas Fiscais](https://enotas.com.br/blog/category/notas-fiscais/)
- [eNotas — Como emitir NFS-e](https://enotas.com.br/blog/como-emitir-nota-fiscal-de-servico/)
- [eNotas — Tipos de Notas Fiscais](https://enotas.com.br/blog/tipos-de-notas-fiscais/)
- [Portal Nacional NFS-e](https://www.nfse.gov.br/)
- [LC 116/2003](http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm)

## Relacionado

- `skills/giss-online/references/nfse-detalhado.md` — artigo completo sobre NFS-e
- `skills/giss-online/references/tipos-notas-fiscais.md` — todos os tipos de NF-e

---

*Última atualização: 2026-07-30 — conteúdo enriquecido com artigos do blog eNotas.*
