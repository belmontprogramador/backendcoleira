import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { loginSchema } from './dtos/login.schema'
import type { LoginDto } from './dtos/login.schema'
import { refreshTokenSchema } from './dtos/refresh-token.schema'
import type { RefreshTokenDto } from './dtos/refresh-token.schema'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { Public } from '../../common/decorators/public.decorator'
import { RegisterUserUseCase } from '../users/application/use-cases/register-user.use-case'
import { registerUserSchema } from '../users/application/dtos/register-user.schema'
import type { RegisterUserDto } from '../users/application/dtos/register-user.schema'
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case'
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case'
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case'
import { verifyEmailSchema } from './dtos/verify-email.schema'
import type { VerifyEmailDto } from './dtos/verify-email.schema'
import { forgotPasswordSchema } from './dtos/forgot-password.schema'
import type { ForgotPasswordDto } from './dtos/forgot-password.schema'
import { resetPasswordSchema } from './dtos/reset-password.schema'
import type { ResetPasswordDto } from './dtos/reset-password.schema'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerUserSchema)) body: RegisterUserDto,
  ): Promise<{ id: string }> {
    return this.registerUser.execute(body)
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(body)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(body.refreshToken)
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(body.refreshToken)
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailDto,
  ): Promise<void> {
    await this.verifyEmailUseCase.execute(body.token)
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: ForgotPasswordDto,
  ): Promise<void> {
    await this.requestPasswordResetUseCase.execute(body.email)
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: ResetPasswordDto,
  ): Promise<void> {
    await this.resetPasswordUseCase.execute(body.token, body.newPassword)
  }
}
