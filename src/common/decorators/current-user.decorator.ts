import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface RequestUser {
  sub: string
  email: string
  roles?: string[]
  permissions?: string[]
}

interface RequestWithUser {
  user?: RequestUser
}

/**
 * Extrai o usuário autenticado (injetado pelo JwtStrategy) da request.
 * Uso: `@CurrentUser() user: RequestUser`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>()
    return request.user
  },
)
