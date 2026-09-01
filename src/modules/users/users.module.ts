import { Module } from '@nestjs/common'
import { USER_REPOSITORY_PORT } from './domain/repositories/user.repository.port'
import { USER_ACCESS_PORT } from '../../common/ports/user-access.port'
import { ROLE_REPOSITORY_PORT } from './domain/repositories/role.repository.port'
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository'
import { PrismaUserAccessRepository } from './infrastructure/repositories/prisma-user-access.repository'
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository'
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case'
import { DeactivateAccountUseCase } from './application/use-cases/deactivate-account.use-case'
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case'
import { ListUsersUseCase } from './application/use-cases/list-users.use-case'
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case'
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case'
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role.use-case'
import { UpdateUserStatusUseCase } from './application/use-cases/update-user-status.use-case'
import { CreateAdminUserUseCase } from './application/use-cases/create-admin-user.use-case'
import { AdminGetUserUseCase } from './application/use-cases/admin-get-user.use-case'
import { AdminUpdateUserUseCase } from './application/use-cases/admin-update-user.use-case'
import { AdminDeleteUserUseCase } from './application/use-cases/admin-delete-user.use-case'
import { RestoreUserUseCase } from './application/use-cases/restore-user.use-case'
import { AdminResetUserPasswordUseCase } from './application/use-cases/admin-reset-user-password.use-case'
import { UserResponseAssembler } from './application/assemblers/user-response.assembler'
import { UsersController } from './presentation/controllers/users.controller'
import { AdminUsersController } from './presentation/controllers/admin-users.controller'

/**
 * Provê as implementações concretas atrás das portas (DIP) e expõe os
 * casos de uso para outros módulos.
 */
@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [
    PrismaUserRepository,
    { provide: USER_REPOSITORY_PORT, useClass: PrismaUserRepository },
    PrismaUserAccessRepository,
    { provide: USER_ACCESS_PORT, useClass: PrismaUserAccessRepository },
    PrismaRoleRepository,
    { provide: ROLE_REPOSITORY_PORT, useClass: PrismaRoleRepository },
    RegisterUserUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    DeactivateAccountUseCase,
    ListUsersUseCase,
    UpdateUserStatusUseCase,
    UpdateUserRoleUseCase,
    CreateAdminUserUseCase,
    AdminGetUserUseCase,
    AdminUpdateUserUseCase,
    AdminDeleteUserUseCase,
    RestoreUserUseCase,
    AdminResetUserPasswordUseCase,
    UserResponseAssembler,
  ],
  exports: [
    USER_REPOSITORY_PORT,
    USER_ACCESS_PORT,
    ROLE_REPOSITORY_PORT,
    RegisterUserUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    DeactivateAccountUseCase,
    ListUsersUseCase,
    UpdateUserStatusUseCase,
    UpdateUserRoleUseCase,
    CreateAdminUserUseCase,
    AdminGetUserUseCase,
    AdminUpdateUserUseCase,
    AdminDeleteUserUseCase,
    RestoreUserUseCase,
    AdminResetUserPasswordUseCase,
  ],
})
export class UsersModule {}
