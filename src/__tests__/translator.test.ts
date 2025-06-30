import { Translator } from '../translator'
import axios from 'axios'
import { BatchTranslateItem } from '../types'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Translator', () => {
  let translator: Translator

  beforeEach(() => {
    translator = new Translator('https://example.com/translate')
    jest.clearAllMocks()
  })

  it('should translate text successfully', async () => {
    const mockResponse = {
      status: 200,
      data: {
        response: {
          status: true,
          result: 'こんにちは',
        },
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBe('こんにちは')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/translate',
      {
        before: 'en',
        after: 'ja',
        text: 'Hello',
        mode: 'html',
      },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      })
    )
  })

  it('should return null on translation error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    })
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('should return null on non-200 status', async () => {
    const mockResponse = {
      status: 500,
      data: {},
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
  })

  it('should return null when response.data.response is undefined', async () => {
    const mockResponse = {
      status: 200,
      data: {},
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
  })

  it('should return null when response.data.response.status is false', async () => {
    const mockResponse = {
      status: 200,
      data: {
        response: {
          status: false,
          result: 'こんにちは',
        },
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
  })

  it('should handle timeout error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    })
    const timeoutError = new Error('timeout')
    mockedAxios.post.mockRejectedValueOnce(timeoutError)

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })
})

describe('Translator - Batch Translation', () => {
  let translator: Translator

  beforeEach(() => {
    translator = new Translator('https://example.com/translate')
    jest.clearAllMocks()
  })

  const mockBatchItems: BatchTranslateItem[] = [
    { id: 'item1', text: 'Hello' },
    { id: 'item2', text: 'World' },
    { id: 'item3', text: 'How are you?' },
  ]

  it('should translate batch items successfully', async () => {
    const mockResponse = {
      status: 200,
      data: {
        status: true,
        processed: 3,
        total: 3,
        executionTime: 500,
        results: [
          {
            id: 'item1',
            success: true,
            original: 'Hello',
            translated: 'こんにちは',
          },
          { id: 'item2', success: true, original: 'World', translated: '世界' },
          {
            id: 'item3',
            success: true,
            original: 'How are you?',
            translated: '元気ですか？',
          },
        ],
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(3)
    expect(result.get('item1')).toBe('こんにちは')
    expect(result.get('item2')).toBe('世界')
    expect(result.get('item3')).toBe('元気ですか？')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/translate',
      {
        batch: true,
        before: 'en',
        after: 'ja',
        texts: mockBatchItems,
        mode: 'html',
      },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 25_000,
      })
    )
  })

  it('should handle partial translation failures', async () => {
    const mockResponse = {
      status: 200,
      data: {
        status: true,
        processed: 2,
        total: 3,
        executionTime: 500,
        results: [
          {
            id: 'item1',
            success: true,
            original: 'Hello',
            translated: 'こんにちは',
          },
          {
            id: 'item2',
            success: false,
            original: 'World',
            error: 'Translation failed',
          },
          {
            id: 'item3',
            success: true,
            original: 'How are you?',
            translated: '元気ですか？',
          },
        ],
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result.size).toBe(3)
    expect(result.get('item1')).toBe('こんにちは')
    expect(result.get('item2')).toBe('World') // fallback to original
    expect(result.get('item3')).toBe('元気ですか？')
  })

  it('should handle empty batch items', async () => {
    const mockResponse = {
      status: 200,
      data: {
        status: true,
        processed: 0,
        total: 0,
        executionTime: 10,
        results: [],
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch([], 'en', 'ja')

    expect(result.size).toBe(0)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/translate',
      {
        batch: true,
        before: 'en',
        after: 'ja',
        texts: [],
        mode: 'html',
      },
      expect.objectContaining({
        timeout: 25_000,
      })
    )
  })

  it('should return original texts on network error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result.size).toBe(3)
    expect(result.get('item1')).toBe('Hello') // fallback to original
    expect(result.get('item2')).toBe('World') // fallback to original
    expect(result.get('item3')).toBe('How are you?') // fallback to original
  })

  it('should return empty map on non-200 status', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    })
    const mockResponse = {
      status: 500,
      data: {
        status: false,
        processed: 0,
        total: 3,
        executionTime: 0,
        results: [],
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result.size).toBe(0) // Non-200 status doesn't trigger fallback
    consoleSpy.mockRestore()
  })

  it('should return empty map when response status is false', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    })
    const mockResponse = {
      status: 200,
      data: {
        status: false,
        processed: 0,
        total: 3,
        executionTime: 0,
        results: [],
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result.size).toBe(0)
    consoleSpy.mockRestore()
  })

  it('should handle axios error with response data', async () => {
    const axiosError = {
      response: {
        status: 429,
        data: { error: 'Rate limit exceeded' },
      },
    }
    mockedAxios.post.mockRejectedValueOnce(axiosError)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    })

    const result = await translator.translateBatch(mockBatchItems, 'en', 'ja')

    expect(result.size).toBe(3)
    expect(result.get('item1')).toBe('Hello')
    expect(consoleSpy).toHaveBeenCalledWith(
      'Batch translation error:',
      axiosError
    )
    // Note: The error response details are logged only if error has response property

    consoleSpy.mockRestore()
  })

  it('should handle large batch efficiently', async () => {
    const largeBatch: BatchTranslateItem[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `item${i}`,
        text: `Text ${i}`,
      })
    )

    const mockResults = largeBatch.map((item) => ({
      id: item.id,
      success: true,
      original: item.text,
      translated: `翻訳 ${item.text}`,
    }))

    const mockResponse = {
      status: 200,
      data: {
        status: true,
        processed: 100,
        total: 100,
        executionTime: 2000,
        results: mockResults,
      },
    }
    mockedAxios.post.mockResolvedValueOnce(mockResponse)

    const result = await translator.translateBatch(largeBatch, 'en', 'ja')

    expect(result.size).toBe(100)
    expect(result.get('item0')).toBe('翻訳 Text 0')
    expect(result.get('item99')).toBe('翻訳 Text 99')
  })
})
