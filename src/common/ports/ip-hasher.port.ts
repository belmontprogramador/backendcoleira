/**
 * Porta de hashing de IP (privacidade do visitante).
 * DIP: a aplicação depende desta abstração. A implementação (SHA-256 + salt)
 * é plugável e o salt vem da configuração — nunca armazenamos IP em claro.
 */
export interface IpHasherPort {
  hash(ip: string | undefined): string | null
}

export const IP_HASHER_PORT = Symbol('IP_HASHER_PORT')
