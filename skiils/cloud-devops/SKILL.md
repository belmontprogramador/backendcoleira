---
name: cloud-devops
description: "AWS, Azure, Docker, Kubernetes, CI/CD, GitOps, DevSecOps, FinOps, disaster recovery e infraestrutura como código."
---

# Cloud & DevOps

Cobre provedores cloud (AWS, Azure), containerização (Docker, Kubernetes), pipelines CI/CD, GitOps, DevSecOps, otimização de custos (FinOps) e estratégias de disaster recovery.

## Quando usar

- Escolhendo serviços AWS/Azure para uma arquitetura
- Projetando Dockerfiles ou estruturando clusters Kubernetes
- Montando pipelines CI/CD ou implementando GitOps
- Aplicando segurança no pipeline (DevSecOps)
- Otimizando custos de cloud ou planejando disaster recovery

## Fluxo

1. Identifique a área: cloud provider, containerização, CI/CD, segurança ou custos
2. Carregue a referência relevante em `references/`
3. Cloud e DevOps são interligados: K8s roda na cloud, CI/CD faz deploy no K8s, FinOps monitora tudo

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [aws.md](references/aws.md) | Serviços AWS por categoria, melhores práticas, serverless |
| [docker.md](references/docker.md) | Docker internals, Dockerfile, compose, networking, volumes |
| [kubernetes.md](references/kubernetes.md) | Arquitetura K8s, pods/deployments/services, 10 design patterns |
| [ci-cd.md](references/ci-cd.md) | Pipelines, GitOps (ArgoCD/Flux), blue-green/canary |
| [devsecops.md](references/devsecops.md) | SAST/DAST, secret management, container scanning, threat modeling |
| [cloud-finops.md](references/cloud-finops.md) | Cost reduction, disaster recovery (RTO/RPO), FinOps |
