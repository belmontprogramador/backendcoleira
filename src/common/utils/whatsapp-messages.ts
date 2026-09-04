/**
 * Monta as mensagens de WhatsApp transacional (enviadas ao tutor).
 * Conteúdo espelha os e-mails correspondentes (contato + scan alert).
 */

export function mapLink(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  if (latitude == null || longitude == null) {
    return null
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

export function locationLine(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  const link = mapLink(latitude, longitude)
  return link ? `📍 ${link}` : '📍 Localização não rastreada'
}

export interface ContactWhatsAppData {
  petName: string
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  message: string
  latitude: number | null
  longitude: number | null
}

export function buildContactMessage(data: ContactWhatsAppData): string {
  return [
    `🐾 Contato sobre ${data.petName}`,
    '',
    `Nome: ${data.senderName || 'não informado'}`,
    `Telefone: ${data.senderPhone || 'não informado'}`,
    `E-mail: ${data.senderEmail || 'não informado'}`,
    '',
    data.message,
    '',
    locationLine(data.latitude, data.longitude),
  ].join('\n')
}

export function buildScanAlertMessage(
  petName: string,
  latitude: number | null,
  longitude: number | null,
): string {
  return [
    `🐾 ${petName} foi visto nesta localização:`,
    '',
    locationLine(latitude, longitude),
  ].join('\n')
}
