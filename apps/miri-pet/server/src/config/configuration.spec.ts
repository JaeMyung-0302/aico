import { configuration } from './configuration'

describe('configuration: ENABLE_GPS_LOCATION', () => {
  const original = process.env.ENABLE_GPS_LOCATION
  afterEach(() => {
    if (original === undefined) delete process.env.ENABLE_GPS_LOCATION
    else process.env.ENABLE_GPS_LOCATION = original
  })

  it('기본값 false', () => {
    delete process.env.ENABLE_GPS_LOCATION
    expect(configuration().isGpsEnabled).toBe(false)
  })

  it("'true'일 때만 true", () => {
    process.env.ENABLE_GPS_LOCATION = 'true'
    expect(configuration().isGpsEnabled).toBe(true)
    process.env.ENABLE_GPS_LOCATION = '1'
    expect(configuration().isGpsEnabled).toBe(false)
  })
})
