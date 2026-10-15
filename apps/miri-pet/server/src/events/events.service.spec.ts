import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { EventsService, POSTHOG_CLIENT, type PosthogClient } from './events.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

const build = async (client: PosthogClient | null) => {
  const moduleRef = await Test.createTestingModule({
    providers: [EventsService, { provide: POSTHOG_CLIENT, useValue: client }],
  }).compile()
  return moduleRef.get(EventsService)
}

describe('EventsService', () => {
  it('distinctId=userId로 서버 이벤트를 보낸다', async () => {
    const client = { capture: jest.fn(), shutdown: jest.fn().mockResolvedValue(undefined) }
    const events = await build(client)
    events.capture(USER_ID, 'pet_created', { species: 'DOG' })
    expect(client.capture).toHaveBeenCalledWith({
      distinctId: USER_ID,
      event: 'pet_created',
      properties: { species: 'DOG' },
    })
  })

  it('키가 없으면(client null) 아무것도 하지 않는다', async () => {
    const events = await build(null)
    expect(() => events.capture(USER_ID, 'vaccination_created')).not.toThrow()
    await expect(events.onModuleDestroy()).resolves.toBeUndefined()
  })

  it('capture가 던져도 요청 처리를 막지 않는다', async () => {
    const client = {
      capture: jest.fn(() => {
        throw new Error('posthog down')
      }),
      shutdown: jest.fn().mockResolvedValue(undefined),
    }
    const events = await build(client)
    expect(() => events.capture(USER_ID, 'pet_created')).not.toThrow()
  })

  it('종료 시 남은 이벤트를 flush한다', async () => {
    const client = { capture: jest.fn(), shutdown: jest.fn().mockResolvedValue(undefined) }
    const events = await build(client)
    await events.onModuleDestroy()
    expect(client.shutdown).toHaveBeenCalledTimes(1)
  })
})

describe('createPosthogClient', () => {
  it('POSTHOG_API_KEY가 비어 있으면 null', async () => {
    const { createPosthogClient } = await import('./events.service')
    expect(createPosthogClient(new ConfigService({ posthog: { apiKey: '', host: 'https://x' } }))).toBeNull()
  })
})
