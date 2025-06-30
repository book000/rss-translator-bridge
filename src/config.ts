import { Config } from './types.js'

export function loadConfig(): Config {
  const gasUrl = process.env.GAS_URL
  if (!gasUrl) {
    throw new Error('GAS_URL environment variable is required')
  }

  return {
    gasUrl,
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    host: process.env.HOST ?? '0.0.0.0',
    defaultSourceLang: process.env.DEFAULT_SOURCE_LANG ?? 'auto',
    defaultTargetLang: process.env.DEFAULT_TARGET_LANG ?? 'ja',
  }
}
