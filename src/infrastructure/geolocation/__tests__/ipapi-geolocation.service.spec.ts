import { IpapiGeolocationService } from '../ipapi-geolocation.service'

describe('IpapiGeolocationService', () => {
  let service: IpapiGeolocationService
  let fetchMock: jest.Mock
  const originalFetch = global.fetch

  function okJson(data: Record<string, unknown>) {
    return { ok: true, json: () => Promise.resolve(data) }
  }

  beforeEach(() => {
    service = new IpapiGeolocationService()
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('retorna "Cidade, Região, País" para IP público', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        city: 'São Paulo',
        region: 'SP',
        country_name: 'Brazil',
      }),
    )

    await expect(service.resolve('187.22.1.1')).resolves.toBe(
      'São Paulo, SP, Brazil',
    )
  })

  it('retorna null para IP privado sem chamar a rede', async () => {
    await expect(service.resolve('192.168.0.1')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna null para loopback IPv6 sem chamar a rede', async () => {
    await expect(service.resolve('::1')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna null para IPv4-mapped loopback (::ffff:127.0.0.1)', async () => {
    await expect(service.resolve('::ffff:127.0.0.1')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna null para ip nulo/undefined/vazio', async () => {
    await expect(service.resolve(null)).resolves.toBeNull()
    await expect(service.resolve(undefined)).resolves.toBeNull()
    await expect(service.resolve('')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna null quando a API responde erro (error:true)', async () => {
    fetchMock.mockResolvedValue(okJson({ error: true, reason: 'RateLimited' }))

    await expect(service.resolve('8.8.8.8')).resolves.toBeNull()
  })

  it('retorna null quando a API marca o IP como reservado', async () => {
    fetchMock.mockResolvedValue(okJson({ reserved: true }))

    await expect(service.resolve('8.8.8.8')).resolves.toBeNull()
  })

  it('retorna null quando HTTP não é 2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false })

    await expect(service.resolve('8.8.8.8')).resolves.toBeNull()
  })

  it('retorna null quando fetch lança (rede/timeout)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(service.resolve('8.8.8.8')).resolves.toBeNull()
  })

  it('monta a string sem cidade quando o campo está ausente', async () => {
    fetchMock.mockResolvedValue(
      okJson({ region: 'SP', country_name: 'Brazil' }),
    )

    await expect(service.resolve('8.8.8.8')).resolves.toBe('SP, Brazil')
  })
})
