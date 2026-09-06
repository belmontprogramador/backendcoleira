import { BadRequestException } from '@nestjs/common'
import { ShippingOAuthController } from '../shipping-oauth.controller'

describe('ShippingOAuthController', () => {
  const oauth = { authorize: jest.fn(), callback: jest.fn() }

  function makeController() {
    return new ShippingOAuthController(oauth as never)
  }

  it('devolve a URL de autorização em JSON', () => {
    oauth.authorize.mockReturnValue('https://me/oauth/authorize')
    const controller = makeController()

    const result = controller.authorize()

    expect(result).toEqual({ url: 'https://me/oauth/authorize' })
  })

  it('lança 400 quando a ME não está configurada', () => {
    oauth.authorize.mockReturnValue(null)
    const controller = makeController()

    expect(() => controller.authorize()).toThrow(BadRequestException)
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
