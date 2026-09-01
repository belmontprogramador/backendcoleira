import { Injectable, Logger } from '@nestjs/common'
import type { IpGeolocationPort } from '../../common/ports/ip-geolocation.port'

/** Base do serviço gratuito ipapi.co (city-level, sem chave). */
const IPAPI_BASE_URL = 'https://ipapi.co'

/** Timeout do lookup — nunca pode travar o scan/mensagem. */
const REQUEST_TIMEOUT_MS = 1500

interface IpapiResponse {
  error?: boolean
  reserved?: boolean
  city?: string
  region?: string
  country_name?: string
  country?: string
}

/**
 * Implementação concreta do `IpGeolocationPort` usando ipapi.co (grátis).
 *
 * - IP privado/reservado → `null` sem chamada de rede.
 * - Falha de rede/timeout/HTTP error → `null` (best-effort, nunca lança).
 * - Sucesso → string "Cidade, Região, País" (aproximada).
 *
 * NÃO persiste o IP cru — o chamador decide o que armazenar (só a string).
 */
@Injectable()
export class IpapiGeolocationService implements IpGeolocationPort {
  private readonly logger = new Logger(IpapiGeolocationService.name)

  async resolve(ip: string | null | undefined): Promise<string | null> {
    if (!ip || this.isPrivateIp(ip)) {
      return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(
        `${IPAPI_BASE_URL}/${encodeURIComponent(ip)}/json/`,
        { signal: controller.signal },
      )
      if (!res.ok) {
        return null
      }
      const data = (await res.json()) as IpapiResponse
      if (!data || data.error || data.reserved) {
        return null
      }
      const parts = [data.city, data.region, data.country_name ?? data.country]
        .map(part => part?.trim())
        .filter(Boolean)
      return parts.length > 0 ? parts.join(', ') : null
    } catch (error) {
      this.logger.warn(
        `Falha ao resolver geolocalização para IP: ${(error as Error).message}`,
      )
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  private isPrivateIp(ip: string): boolean {
    // Loopback / unspecified / link-local IPv6.
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:')) {
      return true
    }
    // IPv4-mapped IPv6 (::ffff:1.2.3.4).
    const v4 = ip.replace(/^::ffff:/i, '')
    const parts = v4.split('.')
    if (parts.length !== 4) {
      return false
    }
    const octets = parts.map(Number)
    if (octets.some(Number.isNaN)) {
      return false
    }
    const [a, b] = octets
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    )
  }
}
