import { envSchema } from '../env.validation'

// Chave AES-256-GCM de 32 bytes em hexadecimal (64 caracteres).
const VALID_ENC_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const VALID_IP_HASH_SALT = 'coleira-ip-hash-salt-com-minimo-32-caracteres'

function validEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db?schema=public',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'access-secret-with-enough-length',
    JWT_REFRESH_SECRET: 'refresh-secret-with-enough-length',
    ACTIVATION_CODE_ENC_KEY: VALID_ENC_KEY,
    IP_HASH_SALT: VALID_IP_HASH_SALT,
    ...overrides,
  }
}

describe('env.validation (config de ambiente)', () => {
  it('valida um ambiente mínimo válido', () => {
    const parsed = envSchema.safeParse(
      validEnv({ NODE_ENV: 'development', PORT: '3000', LOG_LEVEL: 'debug' }),
    )

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.PORT).toBe(3000)
      expect(parsed.data.NODE_ENV).toBe('development')
      expect(parsed.data.JWT_ACCESS_TTL).toBe(900)
      expect(parsed.data.JWT_REFRESH_TTL).toBe(604800)
      expect(parsed.data.ACTIVATION_CODE_ENC_KEY).toBe(VALID_ENC_KEY)
    }
  })

  it('aplica defaults quando campos opcionais são omitidos', () => {
    const parsed = envSchema.safeParse(validEnv())

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.NODE_ENV).toBe('development')
      expect(parsed.data.PORT).toBe(3000)
      expect(parsed.data.LOG_LEVEL).toBe('info')
    }
  })

  it('rejeita DATABASE_URL inválida', () => {
    const parsed = envSchema.safeParse(validEnv({ DATABASE_URL: 'not-a-url' }))
    expect(parsed.success).toBe(false)
  })

  it('rejeita PORT não numérica', () => {
    const parsed = envSchema.safeParse(validEnv({ PORT: 'abc' }))
    expect(parsed.success).toBe(false)
  })

  it('rejeita NODE_ENV fora do enum', () => {
    const parsed = envSchema.safeParse(validEnv({ NODE_ENV: 'staging' }))
    expect(parsed.success).toBe(false)
  })

  it('rejeita JWT secret muito curto', () => {
    const parsed = envSchema.safeParse(validEnv({ JWT_ACCESS_SECRET: 'curto' }))
    expect(parsed.success).toBe(false)
  })

  it('rejeita ACTIVATION_CODE_ENC_KEY ausente', () => {
    const parsed = envSchema.safeParse(
      validEnv({ ACTIVATION_CODE_ENC_KEY: undefined }),
    )
    expect(parsed.success).toBe(false)
  })

  it('rejeita ACTIVATION_CODE_ENC_KEY com tamanho errado', () => {
    const parsed = envSchema.safeParse(
      validEnv({ ACTIVATION_CODE_ENC_KEY: VALID_ENC_KEY.slice(0, 63) }),
    )
    expect(parsed.success).toBe(false)
  })

  it('rejeita ACTIVATION_CODE_ENC_KEY com caracteres não-hex', () => {
    const parsed = envSchema.safeParse(
      validEnv({ ACTIVATION_CODE_ENC_KEY: 'z'.repeat(64) }),
    )
    expect(parsed.success).toBe(false)
  })

  it('rejeita IP_HASH_SALT ausente', () => {
    const parsed = envSchema.safeParse(validEnv({ IP_HASH_SALT: undefined }))
    expect(parsed.success).toBe(false)
  })

  it('rejeita IP_HASH_SALT muito curto (< 32)', () => {
    const parsed = envSchema.safeParse(validEnv({ IP_HASH_SALT: 'curto' }))
    expect(parsed.success).toBe(false)
  })
})
