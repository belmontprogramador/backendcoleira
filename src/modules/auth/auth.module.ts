import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TOKEN_SERVICE_PORT } from '../../common/ports/token-service.port'
import { JwtTokenService } from '../../infrastructure/auth/jwt-token.service'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case'
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case'
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case'

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    { provide: TOKEN_SERVICE_PORT, useClass: JwtTokenService },
  ],
})
export class AuthModule {}
