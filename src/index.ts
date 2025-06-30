import fastify from 'fastify'
import cors from '@fastify/cors'
import { IncomingMessage, ServerResponse } from 'http'
import { loadConfig } from './config.js'
import { RSSProcessor } from './rss-processor.js'
import { TranslateRequest, TranslateResponse } from './types.js'

async function start() {
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
        sourceLang || config.defaultSourceLang || 'auto',
        targetLang || config.defaultTargetLang || 'ja'
      )

      if (!translatedRSS) {
        const response: TranslateResponse = {
          status: 'error',
          error: 'Failed to process RSS feed',
        }
        return reply.code(500).send(response)
      }

      // Return translated RSS as XML
      return reply
        .code(200)
        .header('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(translatedRSS)
    } catch (error) {
      app.log.error(error)
      const response: TranslateResponse = {
        status: 'error',
        error: 'Internal server error',
      }
      return reply.code(500).send(response)
    }
  })

  // Start server
  try {
    await app.listen({
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
    })
    app.log.info(`Server listening on ${config.host}:${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Vercel serverless function export
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const config = loadConfig()
  const app = fastify({
    logger: false,
  })

  await app.register(cors, {
    origin: true,
  })

  const rssProcessor = new RSSProcessor(config.gasUrl)

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
        sourceLang || config.defaultSourceLang || 'auto',
        targetLang || config.defaultTargetLang || 'ja'
      )

      if (!translatedRSS) {
        const response: TranslateResponse = {
          status: 'error',
          error: 'Failed to process RSS feed',
        }
        return reply.code(500).send(response)
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(translatedRSS)
    } catch (error) {
      const response: TranslateResponse = {
        status: 'error',
        error: 'Internal server error',
      }
      return reply.code(500).send(response)
    }
  })

  await app.ready()
  app.server.emit('request', req, res)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void start()
}
