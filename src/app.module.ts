import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthExceptionFilter } from './common/filters/auth-exception.filter'
import { RolesGuard } from './common/guards/roles.guard'
import { FeatureGuard } from './common/guards/feature.guard'
import { envSchema } from './config/env.validation'
import { HealthModule } from './health/health.module'
import { CacheModule } from './infrastructure/cache/cache.module'
import { CryptoModule } from './infrastructure/crypto/crypto.module'
import { DatabaseModule } from './infrastructure/database/database.module'
import { AuditModule } from './infrastructure/audit/audit.module'
import { EmailModule } from './infrastructure/email/email.module'
import { TemporaryTokenStoreModule } from './infrastructure/auth/temporary-token-store.module'
import { RefreshTokenStoreModule } from './infrastructure/auth/refresh-token-store.module'
import { RateLimitModule } from './infrastructure/rate-limit/rate-limit.module'
import { AuthModule } from './modules/auth/auth.module'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { UsersModule } from './modules/users/users.module'
import { PetsModule } from './modules/pets/pets.module'
import { NfcModule } from './modules/nfc/nfc.module'
import { OwnershipModule } from './modules/ownership/ownership.module'
import { PublicProfileModule } from './modules/public-profile/public-profile.module'
import { PublicProfileInvalidationModule } from './modules/public-profile/infrastructure/public-profile-invalidation.module'
import { WhatsAppModule } from './infrastructure/whatsapp/whatsapp.module'
import { AccessEventsModule } from './modules/access-events/access-events.module'
import { ContactModule } from './modules/contact/contact.module'
import { PlansModule } from './modules/plans/plans.module'
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'
import { PetMedicalModule } from './modules/pet-medical/pet-medical.module'
import { PetContactsModule } from './modules/pet-contacts/pet-contacts.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: config => {
        // Fail-fast: se o .env estiver malformado, a aplicação não sobe.
        const parsed = envSchema.safeParse(config)
        if (!parsed.success) {
          throw new Error(
            `Configuração de ambiente inválida: ${JSON.stringify(
              parsed.error.flatten().fieldErrors,
            )}`,
          )
        }
        return parsed.data
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        autoLogging: false,
      },
    }),
    DatabaseModule,
    CacheModule,
    CryptoModule,
    AuditModule,
    EmailModule,
    WhatsAppModule,
    TemporaryTokenStoreModule,
    RefreshTokenStoreModule,
    RateLimitModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PetsModule,
    NfcModule,
    OwnershipModule,
    AccessEventsModule,
    ContactModule,
    PlansModule,
    SubscriptionsModule,
    PetMedicalModule,
    PetContactsModule,
    PublicProfileModule,
    PublicProfileInvalidationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AuthExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
  ],
})
export class AppModule {}
