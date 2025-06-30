import { IncomingMessage, ServerResponse } from 'node:http'
import { getApp } from '../src/index.js'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const app = await getApp()
  await app.ready()
  app.server.emit('request', req, res)
}
