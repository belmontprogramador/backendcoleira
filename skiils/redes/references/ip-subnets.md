# IP e Sub-redes — Referencia Detalhada

## 1. IPv4

Formato: 4 octetos (192.168.0.1), 32 bits, ~4.3 bilhoes enderecos.

Rangos Privados (RFC 1918):
- 10.0.0.0/8 (redes grandes)
- 172.16.0.0/12 (medias)
- 192.168.0.0/16 (pequenas/domesticas)

## 2. CIDR

10.0.1.0/24 = 24 bits rede (255.255.255.0)
/24 = 256 IPs (254 hosts). /25 = 128 IPs. /26 = 64. /27 = 32. /28 = 16.

Mascaras: /24 = 255.255.255.0, /16 = 255.255.0.0, /8 = 255.0.0.0.

## 3. IPv6

128 bits. 340 undecilhoes enderecos. Compressao: zeros a esquerda omitir, grupos de zeros = :: (uma vez).
Ex: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:db8:85a3::8a2e:370:7334

Tipos: Global Unicast (2000::/3), Unique Local (fc00::/7), Link-Local (fe80::/10), Multicast (ff00::/8).

Sem NAT necessario. IPSec mandatorio. Autoconfiguracao (SLAAC).

## 4. NAT

Multiplos dispositivos internos compartilham 1 IP publico.
Router traduz: 192.168.0.10:54321 <-> 203.0.113.5:12345

Tipos: SNAT (interno->internet), DNAT (internet->servidor), PAT (NAT overload).
IPv6 elimina NAT.

## 5. Roteamento

Default Gateway: destino fora da rede -> gateway (192.168.0.1).
Tabela de roteamento: rota mais especifica ganha.
BGP: roteamento entre ISPs. Anuncia blocos IP. AS path.
