import { describe, expect, it } from 'vitest'
import { DISPATCH_HEADER, isDispatchAuthorized } from './auth.ts'

function requestWith(key?: string): Request {
  return new Request('https://miri.example/api/dispatch', {
    method: 'POST',
    headers: key === undefined ? {} : { [DISPATCH_HEADER]: key },
  })
}

describe('isDispatchAuthorized', () => {
  it('denies everything when no key is configured, even a matching header', () => {
    expect(isDispatchAuthorized(requestWith('secret'), undefined)).toBe(false)
    expect(isDispatchAuthorized(requestWith('secret'), '')).toBe(false)
  })

  it('denies a missing or wrong header', () => {
    expect(isDispatchAuthorized(requestWith(), 'secret')).toBe(false)
    expect(isDispatchAuthorized(requestWith('nope'), 'secret')).toBe(false)
    expect(isDispatchAuthorized(requestWith('secre'), 'secret')).toBe(false)
    expect(isDispatchAuthorized(requestWith('secret!'), 'secret')).toBe(false)
  })

  it('allows an exact match', () => {
    expect(isDispatchAuthorized(requestWith('secret'), 'secret')).toBe(true)
  })
})
