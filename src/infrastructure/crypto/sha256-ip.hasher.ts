import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import type { IpHasherPort } from '../../common/ports/ip-hasher.port'

/**
 * Implementação do hashing de IP (SHA-256 + salt) via `ConfigService`.
 * `IP_HASH_SALT` é OBRIGATÓRIO (sem fallback): um salt hardcoded no código
 * permitiria brute-force de endereços IP (OWASP A02 — Cryptographic Failures).
 */
@Injectable()
export class Sha256IpHasher implements IpHasherPort {
  constructor(private readonly config: ConfigService) {}

  hash(ip: string | undefined): string | null {
    if (!ip) {
      return null
    }
    const salt = this.config.getOrThrow<string>('IP_HASH_SALT')
    return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
  }
}
