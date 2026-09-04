import {
  buildContactMessage,
  buildScanAlertMessage,
  locationLine,
  mapLink,
} from '../whatsapp-messages'

describe('whatsapp-messages', () => {
  describe('mapLink', () => {
    it('retorna null sem coords', () => {
      expect(mapLink(null, null)).toBeNull()
      expect(mapLink(undefined, 10)).toBeNull()
      expect(mapLink(-23.5, undefined)).toBeNull()
    })

    it('retorna link do google maps com coords', () => {
      expect(mapLink(-23.5, -46.6)).toBe(
        'https://www.google.com/maps?q=-23.5,-46.6',
      )
    })
  })

  describe('locationLine', () => {
    it('mapa quando há coords', () => {
      expect(locationLine(-23.5, -46.6)).toBe(
        '📍 https://www.google.com/maps?q=-23.5,-46.6',
      )
    })

    it('"não rastreada" sem coords', () => {
      expect(locationLine(null, null)).toBe('📍 Localização não rastreada')
    })
  })

  describe('buildContactMessage', () => {
    it('inclui dados do finder + localização', () => {
      const msg = buildContactMessage({
        petName: 'Benedito',
        senderName: 'Ana',
        senderPhone: '(21) 98888-7777',
        senderEmail: 'ana@x.com',
        message: 'Achei ele!',
        latitude: -23.5,
        longitude: -46.6,
      })

      expect(msg).toContain('🐾 Contato sobre Benedito')
      expect(msg).toContain('Nome: Ana')
      expect(msg).toContain('Telefone: (21) 98888-7777')
      expect(msg).toContain('E-mail: ana@x.com')
      expect(msg).toContain('Achei ele!')
      expect(msg).toContain('https://www.google.com/maps?q=-23.5,-46.6')
    })

    it('usa "não informado" quando o finder omite dados', () => {
      const msg = buildContactMessage({
        petName: 'Benedito',
        senderName: null,
        senderPhone: null,
        senderEmail: null,
        message: 'oi',
        latitude: null,
        longitude: null,
      })

      expect(msg).toContain('Nome: não informado')
      expect(msg).toContain('Telefone: não informado')
      expect(msg).toContain('E-mail: não informado')
      expect(msg).toContain('📍 Localização não rastreada')
    })
  })

  describe('buildScanAlertMessage', () => {
    it('inclui pet + link do mapa', () => {
      const msg = buildScanAlertMessage('Benedito', -23.5, -46.6)

      expect(msg).toContain('🐾 Benedito foi visto nesta localização:')
      expect(msg).toContain('https://www.google.com/maps?q=-23.5,-46.6')
    })

    it('"não rastreada" sem coords', () => {
      const msg = buildScanAlertMessage('Benedito', null, null)

      expect(msg).toContain('📍 Localização não rastreada')
    })
  })
})
