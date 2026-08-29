# CI/CD e GitOps — Referencia Detalhada

## 1. Pipeline CI/CD

[Code] -> [Build] -> [Test] -> [Artifact] -> [Deploy Staging] -> [Smoke] -> [Deploy Prod] -> [Monitor]

**CI:** PR -> review -> merge -> build -> unit/integration tests -> security scan -> publish artifact.
**CD:** Deploy staging -> smoke/E2E -> deploy prod (manual=Delivery, auto=Deployment).

Ferramentas: GitHub Actions, GitLab CI, Jenkins. Registry: ECR, Docker Hub. CD: ArgoCD, Flux.

## 2. Estrategias de Deploy

**Rolling Update:** v2 sobe gradual, v1 morre gradual. Zero downtime.

**Blue-Green:** Blue ativa, Green deployada. Testa Green -> Service aponta Green. Rollback instantaneo (custa 2x).

**Canary:** 90% v1, 10% v2. Monitora -> aumenta. Detecta com pequena %.

**Recreate:** Mata tudo -> sobe. Downtime.

**Shadow:** v1 real, v2 copia (teste sem afetar usuarios).

## 3. GitOps

Git = fonte da verdade. Pull (agente puxa), nao Push (CI empurra). Reconciliacao continua.

**ArgoCD:** monitora Git -> detecta diff -> aplica cluster -> notifica.
**Flux:** monitora Git + registry. CNCF.

GitOps vs Tradicional:
- Quem deploya: agente no cluster (pull) vs CI pipeline (push)
- Rollback: git revert vs pipeline rollback
- Self-healing: drift detection vs manual
- Seguranca: credenciais no cluster vs CI tem credenciais

## 4. Exemplo GitHub Actions + ArgoCD
CI: build Docker -> push ECR -> update GitOps repo (nova tag).
ArgoCD: detecta mudanca -> deploy automatico.
