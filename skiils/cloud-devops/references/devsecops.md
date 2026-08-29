# DevSecOps — Referência Detalhada

## 1. Os 10 Pilares

### 1. Automated Security Checks
- **SAST (Static Application Security Testing):** analisa código fonte. SonarQube, Semgrep, Checkmarx
- **DAST (Dynamic Application Security Testing):** testa app rodando. OWASP ZAP, Burp Suite
- **SCA (Software Composition Analysis):** vulnerabilidades em dependências. Snyk, Dependabot

### 2. Continuous Monitoring
- Métricas de segurança em tempo real: tentativas de login, acessos suspeitos
- SIEM: Splunk, ELK (Elasticsearch + Logstash + Kibana)
- Alertas em anomalias

### 3. CI/CD Automation com Security Gates
```
Build → Unit Tests → SAST → SCA → Container Scan → DAST → Deploy
                                         ↓ falhou?
                                    Bloqueia pipeline!
```
Security gates: se falhar scan, pipeline para. Não deploya código vulnerável.

### 4. Infrastructure as Code (IaC) com Scan
- Scan de Terraform/CloudFormation antes de aplicar
- Ferramentas: tfsec, Checkov, cfn-nag
- Detecta: S3 bucket público, security group aberto 0.0.0.0/0, RDS sem criptografia

### 5. Container Security
- **Image scanning:** vulnerabilidades na imagem (Trivy, Clair, Snyk)
- **Não use `latest`:** tag versionada + sha256
- **USER não-root:** container sem root = menos superfície de ataque
- **Read-only filesystem:** `readOnlyRootFilesystem: true`
- **Seccomp/AppArmor:** restringir syscalls do container

### 6. Secret Management
- **NUNCA** secrets no código, Dockerfile, docker-compose.yml, ou env vars planas
- **HashiCorp Vault:** secrets dinâmicos, rotação automática, audit log
- **AWS Secrets Manager / KMS:** integração nativa AWS
- **K8s Secrets** (com criptografia em repouso + RBAC)
- **External Secrets Operator:** sincroniza AWS/GCP/Azure secrets → K8s Secrets

### 7. Threat Modeling
- Metodologias: STRIDE, PASTA, Attack Trees
- Pergunta: "o que um atacante pode fazer?"
- Identificar ameaças ANTES de codificar (shift-left security)

### 8. QA Integration
- Testes de segurança no pipeline de QA
- Penetration testing regular (interno + terceiro)
- Bug bounty program (HackerOne, Bugcrowd)

### 9. Collaboration & Communication
- Security champions em cada time (dev com interesse em security)
- Post-mortems blameless quando incidentes acontecem
- Documentação de segurança clara e acessível

### 10. Vulnerability Management
- CVEs: identificar → triage (CVSS score) → remediar → verificar
- SLA por severidade: Critical (24h), High (72h), Medium (7d), Low (30d)
- SBOM (Software Bill of Materials): lista de todos componentes do software

---

## 2. Shift-Left Security

```
Segurança Tradicional:  [Dev] → [Deploy] → [Segurança testa no fim]
Shift-Left Security:    [Segurança desde o design] → [Dev com security gates] → [Deploy]
```
Quanto mais cedo encontra vulnerabilidade, mais barato corrigir.

---

## 3. Ferramentas por Estágio

| Estágio | Ferramentas |
|---------|-------------|
| **Design** | Threat Modeling (STRIDE), OWASP ASVS |
| **Código** | SAST (SonarQube, Semgrep), Secrets detection (truffleHog, git-secrets) |
| **Dependências** | SCA (Snyk, Dependabot, Renovate) |
| **Build** | Container scan (Trivy, Grype), IaC scan (tfsec, Checkov) |
| **Test** | DAST (OWASP ZAP), Fuzz testing |
| **Deploy** | Admission controllers (OPA/Gatekeeper), Runtime security (Falco) |
| **Run** | CSPM (Wiz, Orca), CNAPP, SIEM |
