
- **Rate limit removido de `/admin/whatsapp`**: `WhatsAppAdminController` ganhou `@SkipThrottle()` (pula o `default` 10/min — o polling de 3s da página Administração estourava 429 "Muitas requisições"). Throttlers de contato já têm `skipIf`, então `/admin/whatsapp` fica 100% sem rate limit.
