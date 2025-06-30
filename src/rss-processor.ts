import RSSParser from 'rss-parser'
import xml2js from 'xml2js'
import { Translator } from './translator.js'
import { RSSFeed, RSSItem, RSSObject } from './types.js'

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
    targetLang: string
  ): Promise<string | null> {
    try {
      // Fetch and parse RSS feed
      const feed = await this.parser.parseURL(feedUrl)

      // Translate feed title
      if (feed.title) {
        const translatedTitle = await this.translator.translate(
          feed.title,
          sourceLang,
          targetLang
        )
        if (translatedTitle) {
          feed.title = translatedTitle
        }
      }

      // Translate feed description
      if (feed.description) {
        const translatedDescription = await this.translator.translate(
          feed.description,
          sourceLang,
          targetLang
        )
        if (translatedDescription) {
          feed.description = translatedDescription
        }
      }

      // Translate items
      if (feed.items && feed.items.length > 0) {
        for (const item of feed.items) {
          // Translate title
          if (item.title) {
            const translatedTitle = await this.translator.translate(
              item.title,
              sourceLang,
              targetLang
            )
            if (translatedTitle) {
              item.title = translatedTitle
            }
          }

          // Translate content/description
          const content = item.contentEncoded || item.content || item.summary
          if (content) {
            const translatedContent = await this.translator.translate(
              content,
              sourceLang,
              targetLang
            )
            if (translatedContent) {
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
          title: feedData.title || '',
          link: feedData.link || '',
          description: feedData.description || '',
          language: feedData.language || '',
          lastBuildDate: feedData.lastBuildDate || new Date().toUTCString(),
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
          title: item.title || '',
          link: item.link || '',
          description: item.summary || item.content || '',
          pubDate: item.pubDate || '',
          guid: item.guid || item.link || '',
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
