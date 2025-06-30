export interface Config {
  gasUrl: string
  port?: number
  host?: string
  defaultSourceLang?: string
  defaultTargetLang?: string
}

export interface TranslateRequest {
  url: string
  sourceLang?: string
  targetLang?: string
}

export interface TranslateResponse {
  status: 'success' | 'error'
  data?: string
  error?: string
}

export interface GASTranslateRequest {
  before: string
  after: string
  text: string
  mode: 'html'
}

export interface GASTranslateResponse {
  text: string
}

export interface BatchTranslateItem {
  id: string
  text: string
}

export interface GASBatchTranslateRequest {
  batch: true
  before: string
  after: string
  texts: BatchTranslateItem[]
  mode: 'html'
}

export interface BatchTranslateResult {
  id: string
  original: string
  translated: string
  success: boolean
  error?: string
}

export interface GASBatchTranslateResponse {
  status: boolean
  results: BatchTranslateResult[]
  processed: number
  total: number
  executionTime: number
}

export interface RSSItem {
  title?: string
  link?: string
  description?: string
  content?: string
  summary?: string
  contentEncoded?: string
  pubDate?: string
  guid?: string
  creator?: string
  [key: string]: unknown
}

export interface RSSFeed {
  title?: string
  link?: string
  description?: string
  language?: string
  lastBuildDate?: string
  items?: RSSItem[]
  [key: string]: unknown
}

export interface RSSObject {
  rss: {
    $: {
      version: string
      'xmlns:content': string
      'xmlns:dc': string
    }
    channel: {
      title: string
      link: string
      description: string
      language: string
      lastBuildDate: string
      item: {
        title: string
        link: string
        description: string
        pubDate: string
        guid: string
        'content:encoded'?: string
        'dc:creator'?: string
      }[]
    }
  }
}
