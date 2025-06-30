import axios from 'axios'
import { GASTranslateRequest, GASTranslateResponse } from './types.js'

export class Translator {
  constructor(private gasUrl: string) {}

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

      const response = await axios.post<GASTranslateResponse>(
        this.gasUrl,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      )

      if (response.status === 200 && response.data.text) {
        return response.data.text
      }

      return null
    } catch (error) {
      console.error('Translation error:', error)
      return null
    }
  }
}
