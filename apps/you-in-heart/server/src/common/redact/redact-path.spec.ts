import { redactPushTokenPath } from './redact-path'

describe('redactPushTokenPath', () => {
  it.each([
    ['/api/v1/me/push-tokens/ExponentPushToken%5Babc%5D', '/api/v1/me/push-tokens/[Filtered]'],
    ['/me/push-tokens/ExponentPushToken[abc]?x=1', '/me/push-tokens/[Filtered]?x=1'],
    ['/me/push-tokens/a#frag', '/me/push-tokens/[Filtered]#frag'],
    ['a /push-tokens/x and /push-tokens/y', 'a /push-tokens/[Filtered] and /push-tokens/[Filtered]'],
  ])('%s → %s', (input, expected) => {
    expect(redactPushTokenPath(input)).toBe(expected)
  })

  it.each(['/api/v1/me/push-tokens', '/api/v1/me/push-tokens/', '/api/v1/couples/me'])('%s는 그대로', (input) => {
    expect(redactPushTokenPath(input)).toBe(input)
  })
})
