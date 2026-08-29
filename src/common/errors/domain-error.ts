/**
 * Base de todos os erros de domínio/aplicação do projeto.
 *
 * Cada erro concreto declara seu próprio `statusCode` HTTP ao chamar o
 * construtor. O `AuthExceptionFilter` depende SOMENTE desta abstração
 * (`@Catch(DomainError)`) e lê `exception.statusCode` — eliminando o
 * `switch (exception.name)` frágil e a inversão de dependência (o filtro
 * não importa mais erros de ~9 módulos).
 *
 * Convenção de status (HTTP numérico, desacoplado do NestJS `HttpStatus`):
 *   400 Bad Request   — entrada/violação de invariante de domínio
 *   401 Unauthorized  — credencial/token/assinatura inválida
 *   403 Forbidden     — autenticado mas sem permissão (ownership/hierarquia)
 *   404 Not Found     — recurso inexistente
 *   409 Conflict      — estado conflitante (já cadastrado/duplicado)
 */
export abstract class DomainError extends Error {
  readonly statusCode: number

  protected constructor(message: string, statusCode: number) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
  }
}
