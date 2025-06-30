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
    expect(config.defaultExcludeFeedTitle).toBe(true)
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
    process.env.DEFAULT_EXCLUDE_FEED_TITLE = 'false'

    const config = loadConfig()

    expect(config.port).toBe(8080)
    expect(config.host).toBe('localhost')
    expect(config.defaultSourceLang).toBe('en')
    expect(config.defaultTargetLang).toBe('ko')
    expect(config.defaultExcludeFeedTitle).toBe(false)
  })

  it('should handle invalid PORT environment variable', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = 'invalid'

    const config = loadConfig()

    expect(config.port).toBeNaN() // parseInt returns NaN for invalid input
  })

  it('should handle empty string environment variables', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = ''
    process.env.HOST = ''
    process.env.DEFAULT_SOURCE_LANG = ''
    process.env.DEFAULT_TARGET_LANG = ''

    const config = loadConfig()

    expect(config.port).toBeNaN() // parseInt('') returns NaN
    expect(config.host).toBe('') // empty string, not fallback
    expect(config.defaultSourceLang).toBe('') // empty string, not fallback
    expect(config.defaultTargetLang).toBe('') // empty string, not fallback
  })

  it('should handle zero PORT value', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = '0'

    const config = loadConfig()

    expect(config.port).toBe(0) // valid port 0
  })

  it('should handle negative PORT value', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = '-1'

    const config = loadConfig()

    expect(config.port).toBe(-1) // parseInt('-1') returns -1
  })

  it('should handle very large PORT value', () => {
    process.env.GAS_URL = 'https://example.com/gas'
    process.env.PORT = '99999'

    const config = loadConfig()

    expect(config.port).toBe(99_999) // should accept valid large port numbers
  })

  it('should use environment variables as-is without trimming', () => {
    process.env.GAS_URL = '  https://example.com/gas  '
    process.env.HOST = '  localhost  '
    process.env.DEFAULT_SOURCE_LANG = '  en  '
    process.env.DEFAULT_TARGET_LANG = '  ko  '

    const config = loadConfig()

    expect(config.gasUrl).toBe('  https://example.com/gas  ')
    expect(config.host).toBe('  localhost  ')
    expect(config.defaultSourceLang).toBe('  en  ')
    expect(config.defaultTargetLang).toBe('  ko  ')
  })

  describe('defaultExcludeFeedTitle handling', () => {
    beforeEach(() => {
      process.env.GAS_URL = 'https://example.com/gas'
    })

    it('should default to true when DEFAULT_EXCLUDE_FEED_TITLE is not set', () => {
      delete process.env.DEFAULT_EXCLUDE_FEED_TITLE

      const config = loadConfig()

      expect(config.defaultExcludeFeedTitle).toBe(true)
    })

    it('should be true when DEFAULT_EXCLUDE_FEED_TITLE is "true"', () => {
      process.env.DEFAULT_EXCLUDE_FEED_TITLE = 'true'

      const config = loadConfig()

      expect(config.defaultExcludeFeedTitle).toBe(true)
    })

    it('should be false when DEFAULT_EXCLUDE_FEED_TITLE is "false"', () => {
      process.env.DEFAULT_EXCLUDE_FEED_TITLE = 'false'

      const config = loadConfig()

      expect(config.defaultExcludeFeedTitle).toBe(false)
    })

    it('should be true when DEFAULT_EXCLUDE_FEED_TITLE is empty string', () => {
      process.env.DEFAULT_EXCLUDE_FEED_TITLE = ''

      const config = loadConfig()

      expect(config.defaultExcludeFeedTitle).toBe(true)
    })

    it('should be true when DEFAULT_EXCLUDE_FEED_TITLE is any other value', () => {
      process.env.DEFAULT_EXCLUDE_FEED_TITLE = 'anything'

      const config = loadConfig()

      expect(config.defaultExcludeFeedTitle).toBe(true)
    })
  })
})
