const fs = require('fs');
const note = [
  '',
  '## Fix webhook Melhor Envio (2026-09-06)',
  '- `X-ME-Signature` = HMAC-SHA256(body_cru, app_secret) em **base64** (NÃO hex). A ME assina com o **próprio secret do aplicativo** = `MELHOR_ENVIO_CLIENT_SECRET` (não existe segredo separado de webhook).',
  '- Removido `MELHOR_ENVIO_WEBHOOK_SECRET` (era footgun: vazio -> 401 no cadastro do webhook ME). O `MelhorEnvioWebhookValidator` agora usa `MELHOR_ENVIO_CLIENT_SECRET` + `.digest("base64")`.',
  '- **502 no `POST /orders/quote` = OAuth ME ainda não conectada** (credential ausente -> `ShippingGatewayError` 502). Só resolve após concluir o fluxo OAuth (redirect_uri no painel ME = `https://coleira.vps10329.panel.icontainer.cloud/api/shipping/oauth/callback` + botão Conectar no admin).',
  '',
].join('\n');
fs.appendFileSync('MEMORY.md', note, 'utf8');
console.log('appended', note.length, 'chars');
