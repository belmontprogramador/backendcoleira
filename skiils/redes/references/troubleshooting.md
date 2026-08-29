# Troubleshooting de Rede — Cenários Reais

## Cenário 1: "O site está lento" — Diagnosticando Latência

### Passo 1: Isolar a camada
```
Browser → DNS → CDN → Load Balancer → Backend → DB
```
Onde está a lentidão? Elimine camadas da frente pra trás.

### Passo 2: DNS lento?
```bash
dig @8.8.8.8 exemplo.com    # +stats mostra query time
# Query time: 150 msec → DNS está lento (normal < 20ms)
# Verificar TTL baixo forçando re-resolution
```

### Passo 3: Latência de rede?
```bash
mtr exemplo.com              # traceroute contínuo com perda de pacote
# Olhar: loss% > 0% em algum hop? avg > 100ms?
# Último hop com loss = provável problema
# Hops intermediários com loss podem ser falsos (roteadores depriorizam ICMP)

ping -c 100 exemplo.com      # latência consistente?
# Desvio padrão alto (> 10ms) = jitter = problema de qualidade de link
```

### Passo 4: TLS handshake lento?
```bash
curl -w "TCP: %{time_connect}s | TLS: %{time_appconnect}s | Total: %{time_total}s\n" -o /dev/null -s https://exemplo.com
# TCP: 0.050s (ok < 100ms)
# TLS: 0.800s (LENTO! > 300ms = problema no handshake)
# Causas: servidor TLS longe, sem session resumption, CPU saturada
```

### Passo 5: Backend lento?
```bash
curl -w "TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" -o /dev/null -s https://exemplo.com/api/health
# TTFB: 2.500s (LENTO! > 500ms)
# Backend processando devagar. Ver CPU, DB, filas.
```

### Passo 6: Conexões estouradas?
```bash
ss -s                        # resumo de sockets
# Se thousands de TIME_WAIT: muitas conexões abrindo/fechando rápido
# Solução: keep-alive, connection pooling

ss -tlnp                     # portas ouvindo
# Procure: filas de backlog (Recv-Q > 0 = requisições aguardando)
```

---

## Cenário 2: "DNS não resolve" — Debug Completo

```bash
# 1. Seu resolver está funcionando?
dig @8.8.8.8 google.com +short
# Se OK: problema no DNS configurado. Se falha: sem internet.

# 2. Resolver local está bem?
dig google.com               # usa /etc/resolv.conf
cat /etc/resolv.conf          # nameservers configurados

# 3. Domínio específico não resolve?
dig exemplo.com +trace       # trace completo da hierarquia DNS
# Mostra: root → TLD → authoritative
# Se para no TLD: authoritative nameserver offline

# 4. Registro específico?
dig exemplo.com A             # IPv4
dig exemplo.com AAAA          # IPv6
dig exemplo.com MX            # Mail server
dig exemplo.com NS            # Nameservers
dig exemplo.com TXT           # SPF, DKIM

# 5. Cache envenenado?
dig exemplo.com @8.8.8.8     # resposta do Google ≠ sua resposta?
# Seu resolver pode ter cache corrompido. Restart bind/systemd-resolved.

# 6. Propagação? (registro alterado recentemente)
dig exemplo.com @ns1.provedor.com  # consulta direto no authoritative
```

---

## Cenário 3: "Conexão recusada / timeout" — Passo a Passo

```bash
# 1. A porta está ouvindo?
ss -tlnp | grep :3000
# LISTEN 0.0.0.0:3000 → ouvindo em todas interfaces
# LISTEN 127.0.0.1:3000 → SÓ localhost (externo não alcança!)

# 2. Firewall bloqueando?
iptables -L -n -v | grep 3000      # regras iptables
ufw status                          # Ubuntu firewall
# Se DROP na porta: liberar. Se sem regra: firewall não é o problema.

# 3. Teste local
curl -v http://localhost:3000/health
# OK local mas não remoto → firewall, NAT, security group

# 4. Teste remoto (de outro servidor)
curl -v --connect-timeout 5 http://x.x.x.x:3000/health
# connect timeout: porta não alcançável (firewall, SG, interface errada)
# connection refused: porta não está ouvindo (serviço parado)
# 200 OK: estava tudo certo, testador anterior errado :)

# 5. Security Group (cloud)?
aws ec2 describe-security-groups --group-ids sg-xxx
# Verificar inbound rules. 0.0.0.0/0 na porta? IP específico?
```

---

## Cenário 4: "SSL/TLS não funciona" — Debug de Certificado

```bash
# 1. Certificado expirado?
echo | openssl s_client -connect exemplo.com:443 -servername exemplo.com 2>/dev/null | openssl x509 -noout -dates
# notAfter=Dec 31 23:59:59 2025 GMT
# Se data passou: certificado expirado!

# 2. Cadeia de confiança completa?
openssl s_client -connect exemplo.com:443 -showcerts
# Verificar: Root CA → Intermediate → Server cert
# Se falta intermediate: browsers OK (buscam), APIs quebram

# 3. Nome do certificado bate?
echo | openssl s_client -connect exemplo.com:443 -servername exemplo.com 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName
# CN=exemplo.com, DNS:*.exemplo.com, DNS:exemplo.com
# Se você acessa api.exemplo.com mas cert é pra *.outro.com = erro

# 4. Protocolos habilitados?
nmap --script ssl-enum-ciphers -p 443 exemplo.com
# TLSv1.0 habilitado? Desabilitar. Só TLS 1.2 e 1.3.

# 5. Teste online
# https://www.ssllabs.com/ssltest/analyze.html?d=exemplo.com
```

---

## Cenário 5: "Perda de pacotes intermitente"

```bash
# 1. mtr mostra onde perde
mtr -r -c 100 exemplo.com
# Perda no hop 7 (ISP de trânsito) = 5% → link congestionado
# Perda no último hop = 10% → servidor descartando, ver CPU/Rede

# 2. tcpdump para ver retransmissões TCP
tcpdump -i eth0 -nn 'tcp and host exemplo.com' -c 1000
# Muitos [R] (reset) ou retransmissões = problema de rede
# Números de sequência pulando = perda de pacotes

# 3. Banda saturada?
iftop -i eth0
# TX/RX próximo do limite da interface (1 Gbps?)
nload eth0
# Pico sustentado > 80% da capacidade = saturação

# 4. Buffer bloat?
ping -c 100 exemplo.com
# Latência normal: 20ms. Durante transferência: 500ms = buffer bloat
# Solução: fq_codel ou CAKE qdisc
```

---

## Cenário 6: "WebSocket desconectando"

```bash
# 1. Timeout de proxy/LB?
# AWS ALB: idle timeout = 60s padrão. Se WS fica ocioso > 60s → desconecta
# Solução: aumentar idle timeout ou ping a cada 30s

# 2. Verificar handshake
curl -v -H "Upgrade: websocket" -H "Connection: Upgrade" http://exemplo.com/ws
# 101 Switching Protocols → OK
# 400 / 404 → rota errada, proxy não configurado pra WS

# 3. Verificar conexões WS ativas
ss -tnp state ESTABLISHED | grep :3000 | wc -l
# Quantas conexões WS ativas? Aproximando do limite (ulimit -n)?

# 4. Nginx proxy pra WS
# Config correta:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";
# proxy_read_timeout 3600s;  # não fechar WS ocioso
```
