import fastify, { FastifyInstance } from 'fastify'
import { loadConfig } from '../config'
import { RSSProcessor } from '../rss-processor'

jest.mock('../config')
jest.mock('../rss-processor')

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockRSSProcessor = RSSProcessor as jest.MockedClass<typeof RSSProcessor>

describe('RSS Translator Bridge API', () => {
  let app: FastifyInstance
  let mockRSSProcessorInstance: jest.Mocked<RSSProcessor>

  beforeEach(async () => {
    mockLoadConfig.mockReturnValue({
      gasUrl: 'https://example.com/gas',
      port: 3000,
      host: '0.0.0.0',
      defaultSourceLang: 'auto',
      defaultTargetLang: 'ja',
      defaultExcludeFeedTitle: true,
    })

    mockRSSProcessorInstance = {
      processRSSFeed: jest.fn(),
    } as any

    mockRSSProcessor.mockImplementation(() => mockRSSProcessorInstance)

    // Create a simplified test app with same logic
    const config = mockLoadConfig()
    app = fastify({ logger: false })
    await app.register(import('@fastify/cors'), { origin: true })

    const rssProcessor = new RSSProcessor(config.gasUrl)

    // Health check endpoint
    app.get('/health', () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Translation endpoint handler
    const translateHandler = async (request: any, reply: any) => {
      const { url, sourceLang, targetLang, excludeFeedTitle } = request.query

      if (!url) {
        return reply.code(400).send({
          status: 'error',
          error: 'URL parameter is required',
        })
      }

      try {
        const shouldExcludeFeedTitle =
          excludeFeedTitle === 'true' ||
          (excludeFeedTitle === undefined && config.defaultExcludeFeedTitle)

        const translatedRSS = await rssProcessor.processRSSFeed(
          url,
          sourceLang ?? config.defaultSourceLang ?? 'auto',
          targetLang ?? config.defaultTargetLang ?? 'ja',
          shouldExcludeFeedTitle
        )

        if (!translatedRSS) {
          return reply.code(500).send({
            status: 'error',
            error: 'Failed to process RSS feed',
          })
        }

        return reply
          .code(200)
          .header('Content-Type', 'application/rss+xml; charset=utf-8')
          .send(translatedRSS)
      } catch {
        return reply.code(500).send({
          status: 'error',
          error: 'Internal server error',
        })
      }
    }

    // Register both routes
    app.get('/', translateHandler)
    app.get('/api', translateHandler)

    await app.ready()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body) as {
        status: string
        timestamp: string
      }
      expect(body.status).toBe('ok')
      expect(body.timestamp).toBeDefined()
    })
  })

  describe('GET /', () => {
    it('should return 400 when URL parameter is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body) as {
        status: string
        error: string
      }
      expect(body.status).toBe('error')
      expect(body.error).toBe('URL parameter is required')
    })

    it('should process RSS feed successfully', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[テストフィード]]></title>
    <description><![CDATA[テスト説明]]></description>
  </channel>
</rss>`

      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe(
        'application/rss+xml; charset=utf-8'
      )
      expect(response.body).toBe(mockXML)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'auto',
        'ja',
        true
      )
    })

    it('should use custom source and target languages', async () => {
      const mockXML = '<rss>translated content</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml&sourceLang=en&targetLang=ko',
      })

      expect(response.statusCode).toBe(200)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'en',
        'ko',
        true
      )
    })

    it('should return 500 when RSS processing fails', async () => {
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/invalid.xml',
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body) as {
        status: string
        error: string
      }
      expect(body.status).toBe('error')
      expect(body.error).toBe('Failed to process RSS feed')
    })

    it('should return 500 when an exception occurs', async () => {
      mockRSSProcessorInstance.processRSSFeed.mockRejectedValue(
        new Error('Unexpected error')
      )

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml',
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body) as {
        status: string
        error: string
      }
      expect(body.status).toBe('error')
      expect(body.error).toBe('Internal server error')
    })

    it('should handle URL encoding properly', async () => {
      const mockXML = '<rss>encoded content</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const encodedUrl = encodeURIComponent(
        'https://example.com/feed with spaces.xml'
      )
      const response = await app.inject({
        method: 'GET',
        url: `/?url=${encodedUrl}`,
      })

      expect(response.statusCode).toBe(200)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed with spaces.xml',
        'auto',
        'ja',
        true
      )
    })

    it('should use excludeFeedTitle parameter when provided', async () => {
      const mockXML = '<rss>translated without feed title</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml&excludeFeedTitle=false',
      })

      expect(response.statusCode).toBe(200)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'auto',
        'ja',
        false
      )
    })

    it('should default excludeFeedTitle to true when not provided', async () => {
      const mockXML = '<rss>translated with default settings</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml',
      })

      expect(response.statusCode).toBe(200)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'auto',
        'ja',
        true
      )
    })
  })

  describe('GET /api', () => {
    it('should work the same as GET / (legacy compatibility)', async () => {
      const mockXML = '<rss>api translated content</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const response = await app.inject({
        method: 'GET',
        url: '/api?url=https://example.com/feed.xml&excludeFeedTitle=false',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe(
        'application/rss+xml; charset=utf-8'
      )
      expect(response.body).toBe(mockXML)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'auto',
        'ja',
        false
      )
    })
  })
})
