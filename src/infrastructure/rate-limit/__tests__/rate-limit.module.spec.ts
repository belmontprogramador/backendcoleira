import type { ExecutionContext } from '@nestjs/common'
import { isContactRoute } from '../rate-limit.module'

function context(method: string, url: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, originalUrl: url }),
    }),
  } as unknown as ExecutionContext
}

describe('isContactRoute', () => {
  it('retorna true para POST /p/:publicId/contact', () => {
    expect(isContactRoute(context('POST', '/p/7F4K9M2Q/contact'))).toBe(true)
  })

  it('retorna true com query string no contato', () => {
    expect(
      isContactRoute(context('POST', '/p/7F4K9M2Q/contact?source=nfc')),
    ).toBe(true)
  })

  it('retorna false para POST /admin/tags/:publicId/reset', () => {
    expect(isContactRoute(context('POST', '/admin/tags/7F4K9M2Q/reset'))).toBe(
      false,
    )
  })

  it('retorna false para POST /admin/tags/:publicId/reprint-code', () => {
    expect(
      isContactRoute(context('POST', '/admin/tags/7F4K9M2Q/reprint-code')),
    ).toBe(false)
  })

  it('retorna false para POST /admin/tags/:publicId/mark-available', () => {
    expect(
      isContactRoute(context('POST', '/admin/tags/7F4K9M2Q/mark-available')),
    ).toBe(false)
  })

  it('retorna false para GET /p/:publicId', () => {
    expect(isContactRoute(context('GET', '/p/7F4K9M2Q'))).toBe(false)
  })
})
