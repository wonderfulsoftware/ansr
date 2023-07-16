import { z } from 'zod'
import { Env } from '@(-.-)/env'

export const env = Env(
  z.object({
    LINE_LOGIN_CLIENT_ID: z.string(),
    LINE_LOGIN_CLIENT_SECRET: z.string(),
    LINE_CHANNEL_ACCESS_TOKEN: z.string(),
    LINE_WEBHOOK_SECRET_KEY: z.string(),
  }),
)
