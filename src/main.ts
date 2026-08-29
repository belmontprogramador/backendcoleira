import { NestFactory } from '@nestjs/core'
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { envSchema } from './config/env.validation'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  })

  const logger = app.get(Logger)
  app.useLogger(logger)
  app.useGlobalInterceptors(new LoggerErrorInterceptor())

  // Nota: validação de DTOs será feita com Zod (não class-validator), a
  // partir da FASE 1, via ZodValidationPipe global.

  const env = envSchema.parse(process.env)

  // Hardening OWASP A05: headers de segurança (Helmet) + CORS explícito.
  app.use(helmet())

  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true })
  }

  app.enableShutdownHooks()

  await app.listen(env.PORT)
  logger.log(`Coleira API listening on :${env.PORT} (${env.NODE_ENV})`)
}

void bootstrap()
