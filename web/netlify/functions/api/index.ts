import { inferAsyncReturnType } from '@trpc/server'
import {
  CreateAWSLambdaContextOptions,
  awsLambdaRequestHandler,
} from '@trpc/server/adapters/aws-lambda'
import { Event } from '@netlify/functions/dist/function/event'
import { router } from './router'

const createContext = ({
  event,
  context,
}: CreateAWSLambdaContextOptions<Event>) => ({})

export const handler = awsLambdaRequestHandler({
  router: router,
  createContext,
})
