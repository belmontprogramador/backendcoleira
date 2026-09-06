import { BadRequestException } from '@nestjs/common'
import { ShippingOAuthController } from '../shipping-oauth.controller'

describe('ShippingOAuthController', () => {
  const oauth = {
    authorize: jest.fn(),
    callback: jest.fn(),
    isConnected: jest.fn(),
    disconnect: jest.fn(),
  }
  const config = { get: jest.fn() }

  function makeController() {
    return new ShippingOAuthController(oauth as never, config as never)
  }

  function makeRes() {
    const res = {
      redirect: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    }
    res.status.mockReturnValue(res)
    return res as never
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devolve a URL de autorização em JSON', () => {
    oauth.authorize.mockReturnValue('https://me/oauth/authorize')
    const controller = makeController()

    expect(controller.authorize()).toEqual({ url: 'https://me/oauth/authorize' })
  })

  it('lança 400 quando a ME não está configurada', () => {
    oauth.authorize.mockReturnValue(null)
    const controller = makeController()

    expect(() => controller.authorize()).toThrow(BadRequestException)
  })

  describe('callback', () => {
    it('persiste e redireciona ao painel com FRONT_ADMIN_URL configurada', async () => {
      oauth.callback.mockResolvedValue(undefined)
      config.get.mockReturnValue('https://painel.elopet.online/')
      const controller = makeController()
      const res = makeRes()

      await controller.callback('code-1', res)

      expect(oauth.callback).toHaveBeenCalledWith('code-1')
      expect(res.redirect).toHaveBeenCalledWith(
        'https://painel.elopet.online/dashboard/admin?shipping=connected',
      )
    })

    it('devolve JSON { connected: true } sem FRONT_ADMIN_URL', async () => {
      oauth.callback.mockResolvedValue(undefined)
      config.get.mockReturnValue('')
      const controller = makeController()
      const res = makeRes()

      await controller.callback('code-1', res)

      expect(res.redirect).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ connected: true })
    })

    it('redireciona com ?shipping=error em falha', async () => {
      oauth.callback.mockRejectedValue(new Error('boom'))
      config.get.mockReturnValue('https://painel.elopet.online')
      const controller = makeController()
      const res = makeRes()

      await controller.callback('code-1', res)

      expect(res.redirect).toHaveBeenCalledWith(
        'https://painel.elopet.online/dashboard/admin?shipping=error',
      )
    })

    it('redireciona com ?shipping=error sem code', async () => {
      config.get.mockReturnValue('https://painel.elopet.online')
      const controller = makeController()
      const res = makeRes()

      await controller.callback(undefined, res)

      expect(res.redirect).toHaveBeenCalledWith(
        'https://painel.elopet.online/dashboard/admin?shipping=error',
      )
    })
  })

  it('status devolve connected', async () => {
    oauth.isConnected.mockResolvedValue(true)
    const controller = makeController()

    await expect(controller.status()).resolves.toEqual({ connected: true })
    expect(oauth.isConnected).toHaveBeenCalled()
  })

  it('disconnect apaga a credencial', async () => {
    oauth.disconnect.mockResolvedValue(undefined)
    const controller = makeController()

    await expect(controller.disconnect()).resolves.toEqual({
      disconnected: true,
    })
    expect(oauth.disconnect).toHaveBeenCalled()
  })
})
