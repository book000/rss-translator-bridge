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
    })

    mockRSSProcessorInstance = {
      processRSSFeed: jest.fn(),
    } as any

    mockRSSProcessor.mockImplementation(() => mockRSSProcessorInstance)

    app = fastify({ logger: false })
    await app.register(require('@fastify/cors'), { origin: true })

    // Register routes (simplified version of the main app)
    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    app.get<{ Querystring: { url?: string; sourceLang?: string; targetLang?: string } }>(
      '/',
      async (request, reply) => {
        const { url, sourceLang, targetLang } = request.query

        if (!url) {
          return reply.code(400).send({
            status: 'error',
            error: 'URL parameter is required',
          })
        }

        try {
          const config = mockLoadConfig()
          const rssProcessor = new RSSProcessor(config.gasUrl)
          const translatedRSS = await rssProcessor.processRSSFeed(
            url,
            sourceLang ?? config.defaultSourceLang ?? 'auto',
            targetLang ?? config.defaultTargetLang ?? 'ja'
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
        } catch (error) {
          return reply.code(500).send({
            status: 'error',
            error: 'Internal server error',
          })
        }
      }
    )

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
      const body = JSON.parse(response.body)
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
      const body = JSON.parse(response.body)
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
      expect(response.headers['content-type']).toBe('application/rss+xml; charset=utf-8')
      expect(response.body).toBe(mockXML)
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'auto',
        'ja'
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
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        'en',
        'ko'
      )
    })

    it('should return 500 when RSS processing fails', async () => {
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/invalid.xml',
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('error')
      expect(body.error).toBe('Failed to process RSS feed')
    })

    it('should return 500 when an exception occurs', async () => {
      mockRSSProcessorInstance.processRSSFeed.mockRejectedValue(new Error('Unexpected error'))

      const response = await app.inject({
        method: 'GET',
        url: '/?url=https://example.com/feed.xml',
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('error')
      expect(body.error).toBe('Internal server error')
    })

    it('should handle URL encoding properly', async () => {
      const mockXML = '<rss>encoded content</rss>'
      mockRSSProcessorInstance.processRSSFeed.mockResolvedValue(mockXML)

      const encodedUrl = encodeURIComponent('https://example.com/feed with spaces.xml')
      const response = await app.inject({
        method: 'GET',
        url: `/?url=${encodedUrl}`,
      })

      expect(response.statusCode).toBe(200)
      expect(mockRSSProcessorInstance.processRSSFeed).toHaveBeenCalledWith(
        'https://example.com/feed with spaces.xml',
        'auto',
        'ja'
      )
    })
  })
})