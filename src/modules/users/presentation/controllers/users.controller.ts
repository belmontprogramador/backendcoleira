import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common'
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case'
import { DeactivateAccountUseCase } from '../../application/use-cases/deactivate-account.use-case'
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case'
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case'
import { UserResponseAssembler } from '../../application/assemblers/user-response.assembler'
import { changePasswordSchema } from '../../application/dtos/change-password.schema'
import type { ChangePasswordDto } from '../../application/dtos/change-password.schema'
import { updateProfileSchema } from '../../application/dtos/update-profile.schema'
import type { UpdateProfileDto } from '../../application/dtos/update-profile.schema'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas do próprio usuário autenticado (`/users/me`).
 * Todas protegidas por JwtAuthGuard (registrado como guard global).
 */
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly assembler: UserResponseAssembler,
  ) {}

  @Get()
  async me(@CurrentUser() user: RequestUser) {
    const result = await this.getProfile.execute(user.sub)
    return this.assembler.assemble(result)
  }

  @Patch()
  async update(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    const result = await this.updateProfile.execute(user.sub, body)
    return this.assembler.assemble(result)
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(
      user.sub,
      body.currentPassword,
      body.newPassword,
    )
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@CurrentUser() user: RequestUser): Promise<void> {
    await this.deactivateAccount.execute(user.sub)
  }
}
