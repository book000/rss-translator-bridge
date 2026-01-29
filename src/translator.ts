import { createHash } from 'node:crypto'
import axios from 'axios'
import {
  GASTranslateRequest,
  GASBatchTranslateRequest,
  GASBatchTranslateResponse,
  BatchTranslateItem,
  TranslationCacheConfig,
} from './types.js'
import { TranslationCache } from './translation-cache.js'

export class Translator {
  private gasUrl: string
  private cache: TranslationCache

  /** 翻訳クライアントを初期化する。 */
  constructor(gasUrl: string, cacheConfig?: TranslationCacheConfig) {
    this.gasUrl = gasUrl
    this.cache = new TranslationCache(
      cacheConfig ?? { enabled: false, ttlMs: 0, maxItems: 0 }
    )
  }

  /** 翻訳キャッシュのキーを生成する。 */
  private createCacheKey(
    text: string,
    sourceLang: string,
    targetLang: string
  ): string {
    const hash = createHash('sha256').update(text).digest('hex')
    return `${sourceLang}:${targetLang}:${hash}`
  }

  /** 複数テキストをまとめて翻訳する。 */
  async translateBatch(
    items: BatchTranslateItem[],
    sourceLang: string,
    targetLang: string
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    const pendingItems: BatchTranslateItem[] = []
    const cacheKeys = new Map<string, string>()

    for (const item of items) {
      const cacheKey = this.createCacheKey(item.text, sourceLang, targetLang)
      const cached = this.cache.get(cacheKey)
      if (cached !== null) {
        results.set(item.id, cached)
        continue
      }
      pendingItems.push(item)
      cacheKeys.set(item.id, cacheKey)
    }

    if (pendingItems.length === 0) {
      return results
    }

    try {
      const request: GASBatchTranslateRequest = {
        batch: true,
        before: sourceLang,
        after: targetLang,
        texts: pendingItems,
        mode: 'html',
      }

      console.log(
        `Sending batch request with ${pendingItems.length} items to GAS`
      )
      console.log(
        'First 3 items:',
        pendingItems
          .slice(0, 3)
          .map((item) => ({ id: item.id, textLength: item.text.length }))
      )

      const response = await axios.post<GASBatchTranslateResponse>(
        this.gasUrl,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 25_000, // 25 seconds timeout for batch processing (within Vercel's 30s limit)
        }
      )

      console.log('GAS Response status:', response.status)
      console.log('GAS Response data:', {
        status: response.data.status,
        processed: response.data.processed,
        total: response.data.total,
        executionTime: response.data.executionTime,
        resultCount: response.data.results.length,
      })

      if (response.status === 200 && response.data.status) {
        console.log(
          `Processing ${response.data.results.length} results from GAS`
        )

        for (const result of response.data.results) {
          if (result.success && result.translated) {
            results.set(result.id, result.translated)
            const cacheKey = cacheKeys.get(result.id)
            if (cacheKey) {
              this.cache.set(cacheKey, result.translated)
            }
          } else {
            console.log(`Translation failed for ${result.id}:`, result.error)
            // フォールバック：元のテキストを使用
            results.set(result.id, result.original)
          }
        }
        console.log(
          `Batch translation: ${response.data.processed}/${response.data.total} items processed in ${response.data.executionTime}ms`
        )
        console.log(`Client received ${results.size} translated items`)
      } else {
        console.error('GAS returned error status:', response.data)
      }
    } catch (error) {
      console.error('Batch translation error:', error)
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number }
        }
        console.error('Error response data:', axiosError.response?.data)
        console.error('Error response status:', axiosError.response?.status)
      }
      // フォールバック：元のテキストを使用
      for (const item of pendingItems) {
        results.set(item.id, item.text)
      }
    }

    return results
  }

  /** 単一テキストを翻訳する。 */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string | null> {
    const cacheKey = this.createCacheKey(text, sourceLang, targetLang)
    const cached = this.cache.get(cacheKey)
    if (cached !== null) {
      return cached
    }

    try {
      const request: GASTranslateRequest = {
        before: sourceLang,
        after: targetLang,
        text,
        mode: 'html',
      }

      const response = await axios.post<{
        response?: { status?: boolean; result?: string }
      }>(this.gasUrl, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 seconds timeout for Vercel compatibility
      })

      if (response.status === 200 && response.data.response?.status) {
        const translated = response.data.response.result ?? null
        if (translated !== null) {
          this.cache.set(cacheKey, translated)
        }
        return translated
      }

      return null
    } catch (error) {
      console.error('Translation error:', error)
      return null
    }
  }
}
