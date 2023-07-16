import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './appRouter'
import { env } from './env'
import type * as express from 'express'
import { handleLineWebhook } from './webhookHandler'

const trpcHandler = trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: async () => {
    return {}
  },
})

function handleError(response: express.Response, err: unknown) {
  logger.error(err)
  response.status(500).send({ message: 'An error occurred' })
}

export const trpc = onRequest(
  { cors: true, region: 'asia-southeast1' },
  (request, response) => {
    trpcHandler(request, response, (err) => {
      if (err) return handleError(response, err)
    })
  },
)

export const line = onRequest(
  { region: 'asia-southeast1' },
  async (request, response) => {
    try {
      const key = request.query.key
      if (key !== env.LINE_WEBHOOK_SECRET_KEY) {
        logger.warn('Invalid key received from', request.ip)
        response.status(403).send('Forbidden')
        return
      }
      await handleLineWebhook(request.body)
      response.send('ok')
    } catch (err) {
      handleError(response, err)
    }
  },
)
