// Configura variáveis de ambiente para os testes e2e ANTES de qualquer módulo
// (AppModule) ser importado. O `ConfigModule.forRoot` roda no import do
// AppModule, então o `process.env` precisa estar definido aqui (setupFiles do
// Jest executa antes do carregamento do arquivo de teste).
process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'test-webhook-secret'
// Força o gateway MOCK nos testes e2e (nunca chamar a API real do Mercado
// Pago, mesmo que MERCADO_PAGO_ACCESS_TOKEN esteja definido no .env).
process.env.MERCADO_PAGO_ACCESS_TOKEN = ''
process.env.IP_HASH_SALT = 'test-ip-hash-salt-32-caracteres-minimo'
