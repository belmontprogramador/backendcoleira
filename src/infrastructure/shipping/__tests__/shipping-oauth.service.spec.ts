import { ShippingOAuthService } from '../shipping-oauth.service'

describe('ShippingOAuthService', () => {
  const client = {
    buildAuthorizeUrl: jest.fn(),
    exchangeAuthorizationCode: jest.fn(),
  }
  const tokenStore = {
    save: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  }

  const service = new ShippingOAuthService(
    client as never,
    tokenStore as never,
  )

  it('authorize delega a URL ao client', () => {
    client.buildAuthorizeUrl.mockReturnValue(
      'https://me/oauth/authorize?client_id=abc',
    )

    expect(service.authorize('st-1')).toBe(
      'https://me/oauth/authorize?client_id=abc',
    )
    expect(client.buildAuthorizeUrl).toHaveBeenCalledWith('st-1')
  })

  it('callback troca o code e persiste a credencial', async () => {
    client.exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'at-1',
      refresh_token: 'rt-1',
      token_type: 'Bearer',
      expires_in: 2592000,
    })

    await service.callback('code-1')

    expect(client.exchangeAuthorizationCode).toHaveBeenCalledWith('code-1')
    expect(tokenStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'at-1',
        refreshToken: 'rt-1',
      }),
    )
  })

  it('isConnected reflete a presença da credencial', async () => {
    tokenStore.get.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: new Date(),
    })
    await expect(service.isConnected()).resolves.toBe(true)

    tokenStore.get.mockResolvedValue(null)
    await expect(service.isConnected()).resolves.toBe(false)
  })

  it('disconnect apaga a credencial', async () => {
    await service.disconnect()
    expect(tokenStore.delete).toHaveBeenCalled()
  })
})
