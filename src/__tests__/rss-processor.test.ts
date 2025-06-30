import { RSSProcessor } from '../rss-processor'
import RSSParser from 'rss-parser'
import { Translator } from '../translator'

jest.mock('rss-parser')
jest.mock('../translator')

const mockRSSParser = RSSParser as jest.MockedClass<typeof RSSParser>
const mockTranslator = Translator as jest.MockedClass<typeof Translator>

const createMockFeed = () => ({
  title: 'Test Feed',
  description: 'Test Description',
  link: 'https://example.com',
  language: 'en',
  lastBuildDate: '2023-01-01T00:00:00Z',
  items: [
    {
      title: 'Item 1 Title',
      link: 'https://example.com/item1',
      content: 'Item 1 content',
      pubDate: '2023-01-01T00:00:00Z',
      guid: 'item1',
    },
    {
      title: 'Item 2 Title',
      link: 'https://example.com/item2',
      contentEncoded: '<p>Item 2 content encoded</p>',
      summary: 'Item 2 summary',
      pubDate: '2023-01-02T00:00:00Z',
      guid: 'item2',
      creator: 'Author Name',
    },
  ],
})

describe('RSSProcessor', () => {
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

    rssProcessor = new RSSProcessor('https://example.com/gas')
    jest.clearAllMocks()
  })

  describe('processRSSFeed', () => {
    it('should process RSS feed successfully with translations', async () => {
      mockParserInstance.parseURL.mockResolvedValue(createMockFeed())

      const mockTranslations = new Map([
        ['feed-title', 'テストフィード'],
        ['feed-description', 'テスト説明'],
        ['item-0-title', 'アイテム1タイトル'],
        ['item-0-content', 'アイテム1コンテンツ'],
        ['item-1-title', 'アイテム2タイトル'],
        ['item-1-content', '<p>アイテム2コンテンツエンコード</p>'],
      ])
      mockTranslatorInstance.translateBatch.mockResolvedValue(mockTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja',
        false
      )

      expect(result).toBeDefined()
      expect(result).toContain('テストフィード')
      expect(result).toContain('テスト説明')
      expect(result).toContain('アイテム1タイトル')
      expect(result).toContain('アイテム2タイトル')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockParserInstance.parseURL).toHaveBeenCalledWith(
        'https://example.com/feed.xml'
      )
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          { id: 'feed-title', text: 'Test Feed' },
          { id: 'feed-description', text: 'Test Description' },
          { id: 'item-0-title', text: 'Item 1 Title' },
          { id: 'item-0-content', text: 'Item 1 content' },
          { id: 'item-1-title', text: 'Item 2 Title' },
          { id: 'item-1-content', text: '<p>Item 2 content encoded</p>' },
        ]),
        'en',
        'ja'
      )
    })

    it('should handle empty feed items', async () => {
      const emptyFeed = {
        title: 'Empty Feed',
        description: 'Empty Description',
        items: [],
      }
      mockParserInstance.parseURL.mockResolvedValue(emptyFeed)

      const mockTranslations = new Map([['feed-description', 'エンプティ説明']])
      mockTranslatorInstance.translateBatch.mockResolvedValue(mockTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/empty.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      expect(result).toContain('Empty Feed') // title not translated (default behavior)
      expect(result).toContain('エンプティ説明') // description translated
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        [{ id: 'feed-description', text: 'Empty Description' }],
        'en',
        'ja'
      )
    })

    it('should handle feed with missing optional fields', async () => {
      const minimalFeed = {
        items: [
          {
            link: 'https://example.com/item1',
            guid: 'item1',
          },
        ],
      }
      mockParserInstance.parseURL.mockResolvedValue(minimalFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(new Map())

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/minimal.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        [],
        'en',
        'ja'
      )
    })

    it('should prioritize contentEncoded over content and summary', async () => {
      const feedWithMultipleContent = {
        title: 'Test Feed',
        items: [
          {
            title: 'Test Item',
            contentEncoded: '<p>Content Encoded</p>',
            content: 'Regular Content',
            summary: 'Summary Content',
          },
        ],
      }
      mockParserInstance.parseURL.mockResolvedValue(feedWithMultipleContent)
      mockTranslatorInstance.translateBatch.mockResolvedValue(new Map())

      await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          { id: 'item-0-content', text: '<p>Content Encoded</p>' },
        ]),
        'en',
        'ja'
      )
    })

    it('should return null when RSS parsing fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // no-op
      })
      mockParserInstance.parseURL.mockRejectedValue(new Error('Invalid RSS'))

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/invalid.xml',
        'en',
        'ja'
      )

      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })

    it('should return null when translation fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // no-op
      })
      mockParserInstance.parseURL.mockResolvedValue(createMockFeed())
      mockTranslatorInstance.translateBatch.mockRejectedValue(
        new Error('Translation failed')
      )

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })

    it('should handle partial translation failures gracefully', async () => {
      mockParserInstance.parseURL.mockResolvedValue(createMockFeed())

      // Only some translations succeed
      const partialTranslations = new Map([
        ['feed-title', 'テストフィード'],
        ['item-0-title', 'アイテム1タイトル'],
        // missing other translations
      ])
      mockTranslatorInstance.translateBatch.mockResolvedValue(
        partialTranslations
      )

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja',
        false
      )

      expect(result).toBeDefined()
      expect(result).toContain('テストフィード') // translated
      expect(result).toContain('Test Description') // description not translated (not in partial translations)
      expect(result).toContain('アイテム1タイトル') // translated
      expect(result).toContain('Item 1 content') // content not translated (not in partial translations)
    })

    it('should skip feed title translation when skipFeedTitle is true (default)', async () => {
      mockParserInstance.parseURL.mockResolvedValue(createMockFeed())

      // Note: feed-title should NOT be in the translations since skipFeedTitle=true
      const mockTranslations = new Map([
        ['feed-description', 'テスト説明'],
        ['item-0-title', 'アイテム1タイトル'],
        ['item-0-content', 'アイテム1コンテンツ'],
        ['item-1-title', 'アイテム2タイトル'],
        ['item-1-content', '<p>アイテム2コンテンツエンコード</p>'],
      ])
      mockTranslatorInstance.translateBatch.mockResolvedValue(mockTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja',
        true
      )

      expect(result).toBeDefined()
      expect(result).toContain('Test Feed') // original title kept (not translated)
      expect(result).toContain('テスト説明') // description translated
      expect(result).toContain('アイテム1タイトル') // item titles translated

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        expect.not.arrayContaining([{ id: 'feed-title', text: 'Test Feed' }]),
        'en',
        'ja'
      )
    })

    it('should translate feed title when skipFeedTitle is false', async () => {
      mockParserInstance.parseURL.mockResolvedValue(createMockFeed())

      // All translations available
      const mockTranslations = new Map([
        ['feed-title', 'テストフィード'],
        ['feed-description', 'テスト説明'],
        ['item-0-title', 'アイテム1タイトル'],
        ['item-0-content', 'アイテム1コンテンツ'],
        ['item-1-title', 'アイテム2タイトル'],
        ['item-1-content', '<p>アイテム2コンテンツエンコード</p>'],
      ])
      mockTranslatorInstance.translateBatch.mockResolvedValue(mockTranslations)

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja',
        false
      )

      expect(result).toBeDefined()
      expect(result).toContain('テストフィード') // title translated
      expect(result).toContain('テスト説明') // description translated
      expect(result).toContain('アイテム1タイトル') // item titles translated

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTranslatorInstance.translateBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          { id: 'feed-title', text: 'Test Feed' },
          { id: 'feed-description', text: 'Test Description' },
        ]),
        'en',
        'ja'
      )
    })
  })

  describe('feedToXML', () => {
    it('should generate valid RSS XML structure', async () => {
      const simpleFeed = {
        title: 'Simple Feed',
        description: 'Simple Description',
        link: 'https://example.com',
        items: [
          {
            title: 'Simple Item',
            link: 'https://example.com/item',
            content: 'Simple content',
            pubDate: '2023-01-01T00:00:00Z',
            guid: 'simple-item',
          },
        ],
      }

      mockParserInstance.parseURL.mockResolvedValue(simpleFeed)
      mockTranslatorInstance.translateBatch.mockResolvedValue(new Map())

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"')
      expect(result).toContain('<rss version="2.0"')
      expect(result).toContain(
        'xmlns:content="http://purl.org/rss/1.0/modules/content/"'
      )
      expect(result).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"')
      expect(result).toContain('<channel>')
      expect(result).toContain('<title>Simple Feed</title>')
      expect(result).toContain('<item>')
      expect(result).toContain('<title>Simple Item</title>')
    })

    it('should handle content:encoded and dc:creator fields', async () => {
      const feedWithExtras = {
        title: 'Feed with Extras',
        items: [
          {
            title: 'Item with Extras',
            contentEncoded: '<p>Rich content</p>',
            creator: 'John Doe',
            link: 'https://example.com/item',
            guid: 'item-extras',
          },
        ],
      }

      mockParserInstance.parseURL.mockResolvedValue(feedWithExtras)
      mockTranslatorInstance.translateBatch.mockResolvedValue(new Map())

      const result = await rssProcessor.processRSSFeed(
        'https://example.com/feed.xml',
        'en',
        'ja'
      )

      expect(result).toBeDefined()
      expect(result).toContain('<content:encoded>')
      expect(result).toContain('<![CDATA[<p>Rich content</p>]]>')
      expect(result).toContain('<dc:creator>')
      expect(result).toContain('<dc:creator>John Doe</dc:creator>')
    })
  })
})
