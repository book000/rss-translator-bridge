import { RSSProcessor } from '../rss-processor'
import { Translator } from '../translator'
import { loadConfig } from '../config'
import RSSParser from 'rss-parser'

jest.mock('rss-parser')
jest.mock('../translator')

const mockRSSParser = RSSParser as jest.MockedClass<typeof RSSParser>
const mockTranslator = Translator as jest.MockedClass<typeof Translator>

// Integration tests with real-like data flow
describe('Integration Tests', () => {
  describe('RSSProcessor with Translator Integration', () => {
    let rssProcessor: RSSProcessor
    let mockParserInstance: jest.Mocked<RSSParser>
    let mockTranslatorInstance: jest.Mocked<Translator>

    beforeEach(() => {
      // Create mock instances
      mockParserInstance = {
        parseURL: jest.fn(),
      } as any
      
      mockTranslatorInstance = {
        translateBatch: jest.fn(),
      } as any

      mockRSSParser.mockImplementation(() => mockParserInstance)
      mockTranslator.mockImplementation(() => mockTranslatorInstance)

      rssProcessor = new RSSProcessor('https://mock.gas.url')
      jest.clearAllMocks()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should handle complete RSS feed translation workflow', async () => {
      // Mock RSS feed data
      const mockFeed = {
        title: 'Tech News Daily',
        description: 'Latest technology news and updates',
        link: 'https://technews.example.com',
        language: 'en',
        lastBuildDate: '2023-12-01T10:00:00Z',
        items: [
          {
            title: 'AI Revolution in 2024',
            link: 'https://technews.example.com/ai-revolution',
            content: 'Artificial Intelligence is transforming industries worldwide.',
            pubDate: '2023-12-01T09:00:00Z',
            guid: 'ai-revolution-2024',
            creator: 'Tech Reporter',
          },
          {
            title: 'Cloud Computing Trends',
            link: 'https://technews.example.com/cloud-trends',
            contentEncoded: '<p>Cloud computing continues to evolve with <strong>new capabilities</strong>.</p>',
            summary: 'Cloud computing evolution summary',
            pubDate: '2023-12-01T08:00:00Z',
            guid: 'cloud-trends-2023',
          },
        ],
      }

      // Mock translation results
      const mockTranslations = new Map([
        ['feed-title', 'テックニュース・デイリー'],
        ['feed-description', '最新のテクノロジーニュースとアップデート'],
        ['item-0-title', '2024年のAI革命'],
        ['item-0-content', '人工知能が世界中の産業を変革している。'],
        ['item-1-title', 'クラウドコンピューティングのトレンド'],
        ['item-1-content', '<p>クラウドコンピューティングは<strong>新しい機能</strong>で進化し続けています。</p>'],
      ])

      mockParserInstance.parseURL.mockResolvedValue(mockFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(mockTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://technews.example.com/feed.xml',
        'en',
        'ja'
      )

      // Verify the complete workflow
      expect(result).toBeDefined()
      expect(result).toContain('テックニュース・デイリー')
      expect(result).toContain('最新のテクノロジーニュースとアップデート')
      expect(result).toContain('2024年のAI革命')
      expect(result).toContain('クラウドコンピューティングのトレンド')
      expect(result).toContain('<strong>新しい機能</strong>')

      // Verify XML structure (note: xml2js adds standalone="yes")
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"')
      expect(result).toContain('<rss version="2.0"')
      expect(result).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
      expect(result).toContain('<channel>')
      expect(result).toContain('<item>')
      expect(result).toContain('<content:encoded>')
      expect(result).toContain('<dc:creator>')

      // Verify batch translation was called correctly
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          { id: 'feed-title', text: 'Tech News Daily' },
          { id: 'feed-description', text: 'Latest technology news and updates' },
          { id: 'item-0-title', text: 'AI Revolution in 2024' },
          { id: 'item-0-content', text: 'Artificial Intelligence is transforming industries worldwide.' },
          { id: 'item-1-title', text: 'Cloud Computing Trends' },
          { id: 'item-1-content', text: '<p>Cloud computing continues to evolve with <strong>new capabilities</strong>.</p>' },
        ]),
        'en',
        'ja'
      )
    })

    it('should handle RSS feed with missing translations gracefully', async () => {
      const mockFeed = {
        title: 'Simple Feed',
        items: [
          { title: 'Simple Item', content: 'Simple content' },
        ],
      }

      // Only partial translations available
      const partialTranslations = new Map([
        ['feed-title', 'シンプルフィード'],
        // Missing item translations
      ])

      mockParserInstance.parseURL.mockResolvedValue(mockFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(partialTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      expect(result).toContain('シンプルフィード') // translated
      expect(result).toContain('Simple Item') // original (not translated)
      expect(result).toContain('Simple content') // original (not translated)
    })

    it('should handle empty RSS feed', async () => {
      const emptyFeed = {
        title: 'Empty Feed',
        description: 'No items',
        items: [],
      }

      const translations = new Map([
        ['feed-title', 'エンプティフィード'],
        ['feed-description', 'アイテムなし'],
      ])

      mockParserInstance.parseURL.mockResolvedValue(emptyFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(translations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/empty.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      expect(result).toContain('エンプティフィード')
      expect(result).toContain('アイテムなし')
      // Empty items array results in no <item> tags
    })
  })

  describe('Configuration Integration', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('should integrate config with RSSProcessor correctly', () => {
      process.env.GAS_URL = 'https://integration.test.gas.url'
      process.env.DEFAULT_SOURCE_LANG = 'fr'
      process.env.DEFAULT_TARGET_LANG = 'de'

      const config = loadConfig()
      const rssProcessor = new RSSProcessor(config.gasUrl)

      expect(rssProcessor).toBeInstanceOf(RSSProcessor)
      expect(config.gasUrl).toBe('https://integration.test.gas.url')
      expect(config.defaultSourceLang).toBe('fr')
      expect(config.defaultTargetLang).toBe('de')
    })

    it('should handle production-like configuration', () => {
      process.env.GAS_URL = 'https://script.google.com/macros/s/ABC123/exec'
      process.env.PORT = '8080'
      process.env.HOST = '0.0.0.0'
      process.env.DEFAULT_SOURCE_LANG = 'auto'
      process.env.DEFAULT_TARGET_LANG = 'ja'

      const config = loadConfig()

      expect(config.gasUrl).toBe('https://script.google.com/macros/s/ABC123/exec')
      expect(config.port).toBe(8080)
      expect(config.host).toBe('0.0.0.0')
      expect(config.defaultSourceLang).toBe('auto')
      expect(config.defaultTargetLang).toBe('ja')
    })
  })

  describe('Error Handling Integration', () => {
    let rssProcessor: RSSProcessor
    let mockParserInstance: jest.Mocked<RSSParser>
    let mockTranslatorInstance: jest.Mocked<Translator>

    beforeEach(() => {
      mockParserInstance = {
        parseURL: jest.fn(),
      } as any
      
      mockTranslatorInstance = {
        translateBatch: jest.fn(),
      } as any

      mockRSSParser.mockImplementation(() => mockParserInstance)
      mockTranslator.mockImplementation(() => mockTranslatorInstance)
      
      rssProcessor = new RSSProcessor('https://mock.gas.url')
    })

    it('should handle complete failure gracefully', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Network failure'))

      const result = await rssProcessor.processRSSFeed(
        'https://failing.feed.com/rss.xml',
        'en',
        'ja'
      )

      expect(result).toBeNull()
    })

    it('should handle translation service failure', async () => {
      const mockFeed = {
        title: 'Test Feed',
        items: [{ title: 'Test Item' }],
      }

      mockParserInstance.parseURL.mockResolvedValue(mockFeed)
      mockTranslatorInstance.translateBatch.mockRejectedValue(new Error('Translation service down'))

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      expect(result).toBeNull()
    })
  })

  describe('Performance Integration', () => {
    let mockParserInstance: jest.Mocked<RSSParser>
    let mockTranslatorInstance: jest.Mocked<Translator>

    beforeEach(() => {
      mockParserInstance = {
        parseURL: jest.fn(),
      } as any
      
      mockTranslatorInstance = {
        translateBatch: jest.fn(),
      } as any

      mockRSSParser.mockImplementation(() => mockParserInstance)
      mockTranslator.mockImplementation(() => mockTranslatorInstance)
    })

    it('should handle large RSS feeds efficiently', async () => {
      const largeFeed = {
        title: 'Large Feed',
        description: 'Feed with many items',
        items: Array.from({ length: 50 }, (_, i) => ({
          title: `Item ${i + 1}`,
          content: `Content for item ${i + 1}`,
          link: `https://example.com/item${i + 1}`,
          guid: `item-${i + 1}`,
        })),
      }

      const translations = new Map()
      translations.set('feed-title', 'ラージフィード')
      translations.set('feed-description', '多くのアイテムを持つフィード')

      // Add translations for all items
      for (let i = 0; i < 50; i++) {
        translations.set(`item-${i}-title`, `アイテム ${i + 1}`)
        translations.set(`item-${i}-content`, `アイテム ${i + 1} のコンテンツ`)
      }

      mockParserInstance.parseURL.mockResolvedValue(largeFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(translations)

      const rssProcessor = new RSSProcessor('https://mock.gas.url')
      const startTime = Date.now()

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/large-feed.xml',
        'en',
        'ja'
      )

      const endTime = Date.now()
      const executionTime = endTime - startTime

      expect(result).toBeDefined()
      expect(result).toContain('ラージフィード')
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second for mock
      
      // Verify all items are present
      for (let i = 1; i <= 50; i++) {
        expect(result).toContain(`アイテム ${i}`)
      }
    })
  })
})