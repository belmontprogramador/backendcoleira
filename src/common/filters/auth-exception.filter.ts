import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { Response } from 'express'
import { DomainError } from '../errors/domain-error'

/**
 * Converte erros de domínio/aplicação em respostas HTTP adequadas.
 * Evita que erros de negócio virem 500 genérico.
 *
 * Depende só da abstração `DomainError`: cada erro declara seu `statusCode`
 * e o filtro apenas o lê — sem acoplamento a módulos específicos.
 */
@Catch(DomainError)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      message: exception.message,
    })
  }
}
