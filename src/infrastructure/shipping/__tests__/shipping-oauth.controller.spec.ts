import { BadRequestException } from '@nestjs/common'
import { ShippingOAuthController } from '../shipping-oauth.controller'

describe('ShippingOAuthController', () => {
  const oauth = { authorize: jest.fn(), callback: jest.fn() }

  function makeController() {
    return new ShippingOAuthController(oauth as never)
  }

  it('redireciona para a URL de autorização', async () => {
    oauth.authorize.mockReturnValue('https://me/oauth/authorize')
    const controller = makeController()
    const res = { redirect: jest.fn() }

    await controller.authorize(res as never)

    expect(res.redirect).toHaveBeenCalledWith('https://me/oauth/authorize')
  })

  it('lança 400 quando a ME não está configurada', async () => {
    oauth.authorize.mockReturnValue(null)
    const controller = makeController()

    await expect(
      controller.authorize({ redirect: jest.fn() } as never),
    ).rejects.toThrow(BadRequestException)
  })

  it('callback persiste e retorna connected', async () => {
    oauth.callback.mockResolvedValue(undefined)
    const controller = makeController()

    const result = await controller.callback('code-1')

    expect(oauth.callback).toHaveBeenCalledWith('code-1')
    expect(result).toEqual({ connected: true })
  })

  it('lança 400 sem code', async () => {
    const controller = makeController()

    await expect(controller.callback(undefined)).rejects.toThrow(
      BadRequestException,
    )
  })
})
