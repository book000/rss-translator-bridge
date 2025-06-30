import { Translator } from '../translator'
import axios from 'axios'

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
          result: 'こんにちは'
        }
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
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    const result = await translator.translate('Hello', 'en', 'ja')

    expect(result).toBeNull()
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
})
