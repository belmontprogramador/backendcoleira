# NFS-e: Guia Completo

> Fonte: [eNotas Blog — Como emitir NFS-e](https://enotas.com.br/blog/como-emitir-nota-fiscal-de-servico/)

## O que é NFS-e

Nota Fiscal de Serviço Eletrônica é um documento virtual que certifica uma operação de
prestação de serviço. Emitida sempre que há transação entre prestador e tomador, em
ambiente físico ou digital. Possui validade jurídica e fiscal.

## Como funciona a emissão

### 1. Portal da Prefeitura
- Credenciamento prévio da empresa
- Cada prefeitura tem autonomia: pode exigir certificado digital, login/senha, ou ambos
- Sem padrão unificado entre municípios

### 2. Portal Nacional da NFS-e (MEI)
- [nfse.gov.br](https://www.nfse.gov.br/EmissorNacional/Login)
- Obrigatório para MEI desde setembro/2023
- Cadastro simplificado

### 3. Software de automação fiscal
- Ex: eNotas, Tecnospeed, sistemas ERP
- Integração via API que abstrai as diferenças entre prefeituras
- Ideal para alto volume

### 4. Emissores gratuitos
- SEBRAE oferece emissor gratuito para pequenos negócios

## Quem deve emitir

Toda empresa que presta serviço, independente de:
- Tamanho
- Regime tributário (Simples, Lucro Presumido, Lucro Real)
- Tipo de negócio
- MEI (em alguns casos)
- Pessoa física (em alguns casos)

Exemplos: SaaS, cursos online, webinários, clínicas, academias, faculdades, escritórios.

⚠️ Não emitir = multas, juros, e crime de sonegação fiscal em casos extremos.

## Cancelamento

- Pelo portal da prefeitura (guia "Cancelamento de NFS")
- Prazo e regras **variam por município**
- Algumas permitem 24h, outras não permitem cancelamento
- Pode ser autorizado ou rejeitado pela prefeitura

## Termos importantes

### Certificado Digital
- A1: arquivo digital, instalado na máquina, validade 1 ano
- A3: dispositivo físico (token), validade 1-3 anos
- Obrigatório na maioria das prefeituras
- Simples Nacional: algumas cidades permitem emissão sem certificado

### RPS (Recibo Provisório de Serviços)
- Usado quando há problema para gerar NFS-e (sistema da prefeitura offline)
- Depois convertido em NFS-e definitiva
- Prazo de conversão definido por cada município

### Código de Serviço (LC 116)
- Lista de serviços anexa à Lei Complementar 116/2003
- Cada serviço tem um código específico (ex: 01.01 = desenvolvimento de sistemas)

## Impostos na NFS-e

| Imposto | Alíquota típica | Quem recolhe |
|---|---|---|
| ISS | 2% a 5% (municipal) | Prefeitura |
| PIS | 0,65% (cumulativo) / 1,65% (não-cumulativo) | União |
| COFINS | 3% (cumulativo) / 7,6% (não-cumulativo) | União |
| IRRF | 1,5% a 4,8% (varia por serviço) | União |
| INSS | 11% (cessão de mão de obra) | União |
| CSLL | 9% (sobre lucro) | União |

Retenções na fonte: quando o tomador retém na NF e recolhe diretamente.
