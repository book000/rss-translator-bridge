import RSSParser from 'rss-parser'
import xml2js from 'xml2js'
import { Translator } from './translator.js'
import { RSSFeed, RSSItem, RSSObject, BatchTranslateItem } from './types.js'

export class RSSProcessor {
  private parser: RSSParser
  private translator: Translator

  constructor(gasUrl: string) {
    this.parser = new RSSParser({
      customFields: {
        item: [['content:encoded', 'contentEncoded']],
      },
    })
    this.translator = new Translator(gasUrl)
  }

  async processRSSFeed(
    feedUrl: string,
    sourceLang: string,
    targetLang: string,
    excludeFeedTitle = true
  ): Promise<string | null> {
    try {
      // Fetch and parse RSS feed
      const feed = await this.parser.parseURL(feedUrl)

      // Prepare all texts for batch translation
      const batchItems: BatchTranslateItem[] = []

      // Add feed metadata
      if (feed.title && !excludeFeedTitle) {
        batchItems.push({ id: 'feed-title', text: feed.title })
      }
      if (feed.description) {
        batchItems.push({ id: 'feed-description', text: feed.description })
      }

      // Add all feed items (no limit for full translation)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (feed.items?.length) {
        for (const [index, item] of feed.items.entries()) {
          if (item.title) {
            batchItems.push({ id: `item-${index}-title`, text: item.title })
          }

          const content = item.contentEncoded ?? item.content ?? item.summary
          if (content) {
            batchItems.push({ id: `item-${index}-content`, text: content })
          }
        }
      }

      console.log(`Preparing batch translation for ${batchItems.length} items`)

      // Perform batch translation
      const translations = await this.translator.translateBatch(
        batchItems,
        sourceLang,
        targetLang
      )

      // Apply translations to feed metadata
      if (feed.title && !excludeFeedTitle && translations.has('feed-title')) {
        feed.title = translations.get('feed-title') ?? feed.title
      }
      if (feed.description && translations.has('feed-description')) {
        feed.description =
          translations.get('feed-description') ?? feed.description
      }

      // Apply translations to feed items
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (feed.items?.length) {
        for (const [index, item] of feed.items.entries()) {
          const titleKey = `item-${index}-title`
          const contentKey = `item-${index}-content`

          if (item.title && translations.has(titleKey)) {
            item.title = translations.get(titleKey) ?? item.title
          }

          const content = item.contentEncoded ?? item.content ?? item.summary
          if (content && translations.has(contentKey)) {
            const translatedContent = translations.get(contentKey) ?? content

            if (item.contentEncoded) {
              item.contentEncoded = translatedContent
            } else if (item.content) {
              item.content = translatedContent
            } else if (item.summary) {
              item.summary = translatedContent
            }
          }
        }
      }

      // Convert back to XML
      return this.feedToXML(feed)
    } catch (error) {
      console.error('RSS processing error:', error)
      return null
    }
  }

  private feedToXML(feed: RSSParser.Output<RSSItem>): string {
    const feedData = feed as RSSFeed
    const rssObject: RSSObject = {
      rss: {
        $: {
          version: '2.0',
          'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
          'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
        },
        channel: {
          title: feedData.title ?? '',
          link: feedData.link ?? '',
          description: feedData.description ?? '',
          language: feedData.language ?? '',
          lastBuildDate: feedData.lastBuildDate ?? new Date().toUTCString(),
          item: [],
        },
      },
    }

    // Add items
    if (feedData.items && feedData.items.length > 0) {
      rssObject.rss.channel.item = feedData.items.map((item: RSSItem) => {
        const rssItem: {
          title: string
          link: string
          description: string
          pubDate: string
          guid: string
          'content:encoded'?: string
          'dc:creator'?: string
        } = {
          title: item.title ?? '',
          link: item.link ?? '',
          description: item.summary ?? item.content ?? '',
          pubDate: item.pubDate ?? '',
          guid: item.guid ?? item.link ?? '',
        }

        // Add content:encoded if available
        if (item.contentEncoded) {
          rssItem['content:encoded'] = item.contentEncoded
        }

        // Add author if available
        if (item.creator) {
          rssItem['dc:creator'] = item.creator
        }

        return rssItem
      })
    }

    const builder = new xml2js.Builder({
      cdata: true,
      renderOpts: {
        pretty: true,
        indent: '  ',
        newline: '\n',
      },
    })

    return builder.buildObject(rssObject)
  }
}
