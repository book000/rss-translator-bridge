import axios from 'axios'
import {
  GASTranslateRequest,
  GASTranslateResponse,
  GASBatchTranslateRequest,
  GASBatchTranslateResponse,
  BatchTranslateItem,
} from './types.js'

export class Translator {
  constructor(private gasUrl: string) {}

  async translateBatch(
    items: BatchTranslateItem[],
    sourceLang: string,
    targetLang: string
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()

    try {
      const request: GASBatchTranslateRequest = {
        batch: true,
        before: sourceLang,
        after: targetLang,
        texts: items,
        mode: 'html',
      }

      console.log(`Sending batch request with ${items.length} items to GAS`)
      console.log('First 3 items:', items.slice(0, 3).map(item => ({ id: item.id, textLength: item.text.length })))

      const response = await axios.post<GASBatchTranslateResponse>(
        this.gasUrl,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 seconds timeout for batch processing (within Vercel's 30s limit)
        }
      )

      console.log('GAS Response status:', response.status)
      console.log('GAS Response data:', {
        status: response.data.status,
        processed: response.data.processed,
        total: response.data.total,
        executionTime: response.data.executionTime,
        resultCount: response.data.results?.length
      })

      if (response.status === 200 && response.data.status) {
        console.log(`Processing ${response.data.results.length} results from GAS`)
        
        for (const result of response.data.results) {
          if (result.success) {
            results.set(result.id, result.translated)
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
      if (error.response) {
        console.error('Error response data:', error.response.data)
        console.error('Error response status:', error.response.status)
      }
      // フォールバック：元のテキストを使用
      for (const item of items) {
        results.set(item.id, item.text)
      }
    }

    return results
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string | null> {
    try {
      const request: GASTranslateRequest = {
        before: sourceLang,
        after: targetLang,
        text,
        mode: 'html',
      }

      const response = await axios.post<any>(this.gasUrl, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 seconds timeout for Vercel compatibility
      })

      if (
        response.status === 200 &&
        response.data.response &&
        response.data.response.status
      ) {
        return response.data.response.result
      }

      return null
    } catch (error) {
      console.error('Translation error:', error)
      return null
    }
  }
}
