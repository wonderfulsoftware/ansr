import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './appRouter'

const trpcHandler = trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: async () => {
    return {}
  },
})

export const trpc = onRequest(
  { cors: true, region: 'asia-southeast1' },
  (request, response) => {
    trpcHandler(request, response, (err) => {
      if (err) {
        logger.error(err)
        response.status(500).send({ message: 'An error occurred' })
      }
    })
  },
)
