import fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadConfig } from './config.js'
import { RSSProcessor } from './rss-processor.js'
import { TranslateRequest, TranslateResponse } from './types.js'

const currentFilename = fileURLToPath(import.meta.url)
const currentDirname = path.dirname(currentFilename)

export async function getApp() {
  const config = loadConfig()
  const app = fastify({
    logger: true,
  })

  // Register CORS
  await app.register(cors, {
    origin: true,
  })

  // Register static files (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    await app.register(staticPlugin, {
      root: path.join(currentDirname, '../public'),
      prefix: '/',
    })
  }

  const rssProcessor = new RSSProcessor(config.gasUrl)

  // Health check endpoint
  app.get('/health', () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Proxy endpoint for fetching original RSS (CORS workaround)
  app.get<{
    Querystring: { url: string }
  }>('/api/proxy', async (request, reply) => {
    const { url } = request.query

    if (!url) {
      return reply.code(400).send({ error: 'URL parameter is required' })
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        return await reply
          .code(response.status)
          .send({ error: `Failed to fetch RSS: ${response.statusText}` })
      }

      const rssContent = await response.text()
      return await reply
        .code(200)
        .header('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(rssContent)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: 'Failed to fetch original RSS' })
    }
  })

  // Main RSS translation API endpoint
  app.get<{
    Querystring: TranslateRequest
  }>('/api', async (request, reply) => {
    const { url, sourceLang, targetLang, excludeFeedTitle } = request.query

    if (!url) {
      const response: TranslateResponse = {
        status: 'error',
        error: 'URL parameter is required',
      }
      return reply.code(400).send(response)
    }

    try {
      const shouldExcludeFeedTitle =
        excludeFeedTitle === 'true' ||
        (excludeFeedTitle === undefined && config.defaultExcludeFeedTitle)

      const translatedRSS = await rssProcessor.processRSSFeed(
        url,
        sourceLang ?? config.defaultSourceLang ?? 'auto',
        targetLang ?? config.defaultTargetLang ?? 'ja',
        shouldExcludeFeedTitle
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
