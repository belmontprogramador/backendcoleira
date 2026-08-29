# Kubernetes — Referência Detalhada

## 1. Arquitetura

```
[Control Plane]
├── API Server      ← kubectl fala com ele. Frontend do cluster
├── etcd            ← banco de dados (estado do cluster). Consistent, CP
├── Scheduler       ← decide em qual node cada Pod roda
└── Controller Mgr  ← reconciliation loops (Deployment, ReplicaSet, Node)

[Worker Nodes]
├── kubelet         ← agente que gerencia Pods no node
├── kube-proxy      ← rede (Services, iptables/ipvs)
└── Container Runtime  ← containerd, CRI-O (Docker foi deprecado)
```

### Fluxo: kubectl apply → Pod rodando
1. `kubectl apply -f deployment.yaml` → API Server
2. API Server armazena no etcd
3. Deployment Controller detecta estado desejado ≠ real → cria ReplicaSet
4. ReplicaSet Controller detecta → cria Pod (ainda sem node)
5. Scheduler vê Pod pendente → escolhe node (recursos, afinidade, taints)
6. kubelet no node recebe Pod → cria containers via CRI
7. kube-proxy atualiza iptables para Service alcançar o Pod

---

## 2. Objetos Essenciais

### Pod
- Menor unidade. 1+ containers que compartilham network e storage
- Efêmero (morre e é recriado com IP novo)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: myapp:1.0
      ports:
        - containerPort: 3000
      resources:
        requests: { memory: "128Mi", cpu: "250m" }
        limits: { memory: "256Mi", cpu: "500m" }
```

### Deployment
- Gerencia ReplicaSet → gerencia Pods
- Rolling update, rollback, scale
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:  # template do Pod (idêntico à definição de Pod acima)
    spec:
      containers:
        - name: app
          image: myapp:1.0
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

### Service
- IP estável e DNS para grupo de Pods (que têm IPs efêmeros)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP  # ou NodePort, LoadBalancer
```

### ConfigMap & Secret
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: debug
  API_URL: https://api.example.com
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: c3VwZXJzZWNyZXQ=  # base64
```

### Ingress
- HTTP routing externo → Services internos
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users
            backend:
              service:
                name: user-service
                port:
                  number: 80
```

---

## 3. Top 10 K8s Design Patterns

### 1. Declarative Configuration
YAML/JSON descreve estado desejado. K8s reconcilia (não é imperativo "faça X").

### 2. Reconciliation Loop
```
for {
  estadoAtual := observar()
  estadoDesejado := lerConfig()
  if estadoAtual != estadoDesejado {
    ajustar(estadoDesejado)
  }
}
```
Todo controller é um reconciliation loop.

### 3. Sidecar
Container auxiliar no mesmo Pod. Ex: Envoy proxy (service mesh), logging agent (Fluentd), config reloader.
```yaml
containers:
  - name: app
  - name: envoy-proxy  # sidecar: gerencia tráfego
```

### 4. Ambassador
Proxy que abstrai serviço externo. App fala `localhost:9000`, Ambassador encaminha para DB externo.

### 5. Adapter
Normaliza output de serviços heterogêneos. Ex: diferentes apps expõem métricas em formatos diferentes → Adapter converte para Prometheus.

### 6. Leader Election
Garante que apenas 1 réplica executa tarefa (ex: cron job). K8s Lease resource.

### 7. Health Probes
- **Liveness:** "devo reiniciar este container?" (travou, deadlock)
- **Readiness:** "devo enviar tráfego?" (DB ainda não conectou)
- **Startup:** "já inicializei?" (Java/.NET lento para subir)

### 8. Operator
Controller customizado para domínio específico. Ex: Prometheus Operator gerencia Prometheus + AlertManager + ServiceMonitors.

### 9. Service Mesh
Sidecar proxies (Envoy) gerenciam comunicação: mTLS, retry, circuit breaker, telemetria. Istio/Linkerd.

### 10. Canary / Blue-Green
- **Canary:** 90% v1, 10% v2. Monitora → aumenta v2. K8s: 2 Deployments, 1 Service com pesos
- **Blue-Green:** Blue ativo, Green deployado. Testa Green → Service aponta para Green

---

## 4. HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
spec:
  scaleTargetRef:
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
CPU > 70% → escala. CPU < 70% → reduz. Pode usar métricas customizadas (Prometheus, SQS queue depth).

---

## 5. kubectl — Comandos Essenciais
```bash
kubectl get pods -n namespace
kubectl describe pod my-pod         # eventos, estado detalhado
kubectl logs my-pod -c container    # logs
kubectl exec -it my-pod -- /bin/sh  # shell no container
kubectl apply -f deployment.yaml
kubectl rollout restart deployment/my-app
kubectl rollout undo deployment/my-app  # rollback
kubectl port-forward pod/my-pod 3000:3000  # dev acesso local
kubectl top pods                     # uso de recursos
```
