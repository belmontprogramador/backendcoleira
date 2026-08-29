import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

/**
 * Pipe de validação baseado em Zod (substitui class-validator).
 * Uso: `@Body(new ZodValidationPipe(loginSchema)) body: LoginDto`.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validação falhou',
        errors: result.error.flatten().fieldErrors,
      })
    }
    return result.data
  }
}
