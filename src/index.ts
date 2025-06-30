import fastify from 'fastify'
import cors from '@fastify/cors'
import { loadConfig } from './config.js'
import { RSSProcessor } from './rss-processor.js'
import { TranslateRequest, TranslateResponse } from './types.js'

export async function getApp() {
  const config = loadConfig()
  const app = fastify({
    logger: true,
  })

  // Register CORS
  await app.register(cors, {
    origin: true,
  })

  const rssProcessor = new RSSProcessor(config.gasUrl)

  // Health check endpoint
  app.get('/health', () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Main RSS translation endpoint
  app.get<{
    Querystring: TranslateRequest
  }>('/', async (request, reply) => {
    const { url, sourceLang, targetLang } = request.query

    if (!url) {
      const response: TranslateResponse = {
        status: 'error',
        error: 'URL parameter is required',
      }
      return reply.code(400).send(response)
    }

    try {
      const translatedRSS = await rssProcessor.processRSSFeed(
        url,
        sourceLang ?? config.defaultSourceLang ?? 'auto',
        targetLang ?? config.defaultTargetLang ?? 'ja'
      )

      if (!translatedRSS) {
        const response: TranslateResponse = {
          status: 'error',
          error: 'Failed to process RSS feed',
        }
        return await reply.code(500).send(response)
      }

      // Return translated RSS as XML
      return await reply
        .code(200)
        .header('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(translatedRSS)
    } catch (error) {
      app.log.error(error)
      const response: TranslateResponse = {
        status: 'error',
        error: 'Internal server error',
      }
      return await reply.code(500).send(response)
    }
  })

  return app
}

async function start() {
  const config = loadConfig()
  const app = await getApp()

  // Start server
  try {
    await app.listen({
      port: config.port ?? 3000,
      host: config.host ?? '0.0.0.0',
    })
    app.log.info(`Server listening on ${config.host}:${config.port}`)
  } catch (error) {
    app.log.error(error)
    throw new Error('Failed to start server')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error: unknown) => {
    console.error('Failed to start server:', error)
    throw error
  })
}
