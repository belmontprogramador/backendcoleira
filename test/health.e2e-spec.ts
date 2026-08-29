import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'

type HealthBody = {
  status: string
  info: { database: { status: string }; cache: { status: string } }
}

describe('Health (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health responde 200 com banco e cache up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)

    const body = res.body as HealthBody

    expect(body.status).toBe('ok')
    expect(body.info.database.status).toBe('up')
    expect(body.info.cache.status).toBe('up')
  })
})
