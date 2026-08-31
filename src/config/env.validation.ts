import { z } from 'zod'

/**
 * Schema de validação das variáveis de ambiente.
 * É a fonte da verdade para a tipagem do processo em runtime — se uma
 * variável obrigatória estiver ausente ou malformada, a aplicação falha
 * na inicialização (fail-fast) em vez de quebrar no meio da execução.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  ACTIVATION_CODE_ENC_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'ACTIVATION_CODE_ENC_KEY deve ser 32 bytes em hexadecimal (64 caracteres)',
    ),
  IP_HASH_SALT: z.string().min(32),
  CORS_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(16).optional(),
})

export type Env = z.infer<typeof envSchema>
