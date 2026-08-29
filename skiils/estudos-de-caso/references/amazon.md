# Amazon — SOA, DynamoDB e 100ms = 1%

## 1. O Mandato Bezos (~2002)

1. Todos times expoem dados via service interfaces
2. Comunicacao entre times SO via essas interfaces
3. Nenhuma outra forma de IPC
4. Tecnologia nao importa (HTTP, Corba, pubsub, custom)
5. Interfaces externalizaveis DESDE O INICIO
6. Quem nao fizer = demitido

Este mandato FORCOU SOA em toda Amazon. Depois nasceu AWS (venderam infra interna como produto).

## 2. DynamoDB (Nascido da Amazon Interna)

Dynamo (2007 paper) -> DynamoDB (2012).
Consistent Hashing, Vector Clocks, Sloppy Quorum, Hinted Handoff, Gossip.
Single-digit ms, escala automatica, serverless. Base de Amazon.com, Alexa, Prime Video.

## 3. 100ms = 1% em Vendas

Estudo interno (~2006): cada 100ms de latencia extra = -1% vendas.
Isso moldou TUDO: CDN, cache em todas camadas, CloudFront, latencia = metrica de negocio.

## 4. Licoes
1. Mandato de cima forcou boa arquitetura
2. APIs externalizaveis = nasceu AWS (dogfooding)
3. Latencia e dinheiro (100ms = 1%)
4. DynamoDB nasceu de necessidade real de escala elastica
