import { loadConfig } from '../config'

describe('loadConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should load config with required GAS_URL', () => {
    process.env.GAS_URL = 'https://example.com/gas'

    const config = loadConfig()

    expect(config.gasUrl).toBe('https://example.com/gas')
    expect(config.port).toBe(3000)
    expect(config.host).toBe('0.0.0.0')
    expect(config.defaultSourceLang).toBe('auto')
    expect(config.defaultTargetLang).toBe('ja')
  })

  it('should throw error when GAS_URL is not set', () => {
    delete process.env.GAS_URL

    expect(() => loadConfig()).toThrow(
      'GAS_URL environment variable is required'
    )
  })

  it('should use custom values from environment', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = '8080'
    process.env.HOST = 'localhost'
    process.env.DEFAULT_SOURCE_LANG = 'en'
    process.env.DEFAULT_TARGET_LANG = 'ko'

    const config = loadConfig()

    expect(config.port).toBe(8080)
    expect(config.host).toBe('localhost')
    expect(config.defaultSourceLang).toBe('en')
    expect(config.defaultTargetLang).toBe('ko')
  })
})
