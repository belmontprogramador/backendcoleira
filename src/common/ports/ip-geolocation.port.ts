/**
 * Porta de geolocalização por IP (transversal).
 *
 * Resolve um IP para uma localização aproximada legível (ex.: "São Paulo, SP,
 * Brasil") — NUNCA precisão de GPS. Fica em `common/ports` para que use cases
 * de qualquer módulo (perfil público, contato) possam consumi-la sem depender
 * de implementação concreta (DIP).
 *
 * Sempre best-effort: implementações devem retornar `null` (e nunca lançar)
 * quando o IP for privado/reservado, o serviço falhar ou estourar timeout.
 */
export interface IpGeolocationPort {
  resolve(ip: string | null | undefined): Promise<string | null>
}

export const IP_GEOLOCATION_PORT = Symbol('IP_GEOLOCATION_PORT')
