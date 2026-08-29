# 12-Factor App — Referencia Detalhada

Metodologia criada pelo Heroku (2011). Padrao ouro para cloud-native apps.

## 1. Codebase: 1 app = 1 repo. Multiplos deploys do mesmo codebase.

## 2. Dependencies: Declarar explicitamente (package.json, go.mod). Isolar (node_modules, containers). Nunca depender de ferramentas globais.

## 3. Config: Tudo que varia entre deploys (URLs, credenciais). NO ENVIRONMENT. Nunca no codigo. Use env vars + ConfigMap/Secret/Vault.

## 4. Backing Services: DB, cache, fila, storage = recursos externos. Trocar MySQL local por RDS = so mudar URL.

## 5. Build, Release, Run: Build (codigo -> artefato). Release (artefato + config). Run (executa release). Separacao estrita. Rollback = release anterior.

## 6. Processes: Stateless, share-nothing. Dados persistentes -> backing service. Nunca sticky sessions.

## 7. Port Binding: App exporta servico via porta. Self-contained. Sem Apache/Tomcat externo.

## 8. Concurrency: Escalar via processos (horizontal), nao threads. K8s: escalar Pods.

## 9. Disposability: Startup em segundos. Shutdown gracioso (SIGTERM -> terminar requests -> sair). K8s terminationGracePeriodSeconds.

## 10. Dev/Prod Parity: Ambientes parecidos. SQLite em dev, PG em prod = NAO. Deploy continuo (minutos, nao meses). Devs fazem deploy.

## 11. Logs: Streams de eventos (stdout/stderr). Nunca arquivos. Estruturados (JSON) para busca.

## 12. Admin Processes: Tarefas isoladas e efemeras. Migracoes, scripts pontuais. K8s Jobs/CronJobs.
