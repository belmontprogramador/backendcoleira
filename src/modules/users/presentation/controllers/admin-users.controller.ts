import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case'
import { UpdateUserStatusUseCase } from '../../application/use-cases/update-user-status.use-case'
import { UpdateUserRoleUseCase } from '../../application/use-cases/update-user-role.use-case'
import { CreateAdminUserUseCase } from '../../application/use-cases/create-admin-user.use-case'
import { AdminGetUserUseCase } from '../../application/use-cases/admin-get-user.use-case'
import { AdminUpdateUserUseCase } from '../../application/use-cases/admin-update-user.use-case'
import { AdminDeleteUserUseCase } from '../../application/use-cases/admin-delete-user.use-case'
import { RestoreUserUseCase } from '../../application/use-cases/restore-user.use-case'
import { AdminResetUserPasswordUseCase } from '../../application/use-cases/admin-reset-user-password.use-case'
import { UserResponseAssembler } from '../../application/assemblers/user-response.assembler'
import { listUsersSchema } from '../../application/dtos/list-users.schema'
import type { ListUsersDto } from '../../application/dtos/list-users.schema'
import { updateUserStatusSchema } from '../../application/dtos/update-user-status.schema'
import type { UpdateUserStatusDto } from '../../application/dtos/update-user-status.schema'
import { updateUserRoleSchema } from '../../application/dtos/update-user-role.schema'
import type { UpdateUserRoleDto } from '../../application/dtos/update-user-role.schema'
import { createAdminUserSchema } from '../../application/dtos/create-admin-user.schema'
import type { CreateAdminUserDto } from '../../application/dtos/create-admin-user.schema'
import { adminUpdateUserSchema } from '../../application/dtos/admin-update-user.schema'
import type { AdminUpdateUserDto } from '../../application/dtos/admin-update-user.schema'
import { Roles } from '../../../../common/decorators/roles.decorator'
import { Permissions } from '../../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'

/**
 * Rotas administrativas de usuários (`/admin/users`).
 *
 * - `GET /admin/users` e `PATCH /admin/users/:id/status` → requer ADMIN.
 * - `PATCH /admin/users/:id/role` → requer SUPER_ADMIN (permissão `user:role`).
 * - `POST /admin/users` → requer SUPER_ADMIN (cria ADMIN/SUPER_ADMIN).
 * - `GET/PATCH/DELETE /admin/users/:id` → CRUD de usuário cliente (hierarquia).
 */
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateStatusUseCase: UpdateUserStatusUseCase,
    private readonly updateRoleUseCase: UpdateUserRoleUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly adminGetUserUseCase: AdminGetUserUseCase,
    private readonly adminUpdateUserUseCase: AdminUpdateUserUseCase,
    private readonly adminDeleteUserUseCase: AdminDeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
    private readonly adminResetPasswordUseCase: AdminResetUserPasswordUseCase,
    private readonly assembler: UserResponseAssembler,
  ) {}

  @Get()
  @Roles('ADMIN')
  async list(
    @Query(new ZodValidationPipe(listUsersSchema)) query: ListUsersDto,
  ) {
    const { data, total, page, limit } =
      await this.listUsersUseCase.execute(query)
    const items = await this.assembler.assembleMany(data)
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  @Post()
  @Permissions('user:role')
  async createAdmin(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createAdminUserSchema))
    body: CreateAdminUserDto,
  ) {
    const result = await this.createAdminUserUseCase.execute(user.roles ?? [], {
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
    })
    return result
  }

  @Get(':id')
  @Roles('ADMIN')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.adminGetUserUseCase.execute(user.roles ?? [], id)
    return this.assembler.assemble(result)
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateUserSchema))
    body: AdminUpdateUserDto,
  ) {
    const result = await this.adminUpdateUserUseCase.execute(
      user.roles ?? [],
      id,
      body,
    )
    return this.assembler.assemble(result)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.adminDeleteUserUseCase.execute(user.roles ?? [], id)
  }

  @Post(':id/restore')
  @Roles('ADMIN')
  async restore(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.restoreUserUseCase.execute(user.roles ?? [], id)
    return this.assembler.assemble(result)
  }

  @Patch(':id/status')
  @Permissions('user:status')
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    body: UpdateUserStatusDto,
  ) {
    const result = await this.updateStatusUseCase.execute(
      user.roles ?? [],
      id,
      body.status,
    )
    return this.assembler.assemble(result)
  }

  @Patch(':id/role')
  @Permissions('user:role')
  async updateRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema)) body: UpdateUserRoleDto,
  ) {
    await this.updateRoleUseCase.execute(user.roles ?? [], id, body.role)
  }

  @Post(':id/password')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.adminResetPasswordUseCase.execute(user.roles ?? [], id)
  }
}
