# AWS — Referencia Detalhada

## 1. Compute

**EC2:** Maquina virtual. Familias: T/M (general), C (compute), R/X (memoria), I/D (storage), G/P (GPU). Modelos: on-demand, reserved (-72%), spot (-90% interrompivel).

**Lambda:** Serverless. 15 min timeout, 10 GB RAM. Triggers: API Gateway, S3, SQS, EventBridge. Cold start mitigado com SnapStart/provisioned concurrency.

**ECS:** Orquestracao AWS-native. Fargate (serverless) ou EC2 mode. Mais simples que EKS.

**EKS:** K8s gerenciado. ~$0.10/h + nodes.

## 2. Storage
**S3:** Object storage. Classes: Standard, IA, Glacier. Versioning, encryption, lifecycle.

**EBS:** Disco bloco EC2. SSD/HDD. Snapshots incrementais.

**EFS:** NFS gerenciado. Multi-AZ. Multiplas instancias.

## 3. Database
RDS (SQL gerenciado), Aurora (5x rapido, serverless), DynamoDB (key-value, ms), ElastiCache (Redis), Redshift (DW), Neptune (grafo).

## 4. Networking
VPC, CloudFront (CDN), Route 53 (DNS), API Gateway, ELB (ALB/NLB/GWLB).

## 5. Messaging
SQS (filas), SNS (pub/sub), EventBridge (event bus), Kinesis (streaming).

## 6. Security
IAM (roles > users), Cognito (auth), KMS, Secrets Manager, WAF, Shield, CloudTrail.

## 7. Monitoring
CloudWatch (metricas/logs), X-Ray (tracing), Config (compliance).

## 8. IaC
CloudFormation (YAML), CDK (codigo), Terraform (multi-cloud).
