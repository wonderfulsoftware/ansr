import { Application, Router } from 'https://deno.land/x/oak@v12.1.0/mod.ts'
import * as log from 'https://deno.land/std@0.182.0/log/mod.ts'
import ky from 'https://esm.sh/ky@0.33.3'
import { handle } from './logic.ts'

const port = +Deno.env.get('PORT')! || 4752
const expectedKey = Deno.env.get('LINE_WEBHOOK_SECRET_KEY')!
const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
const allowedDomains = Deno.env.get('ALLOWED_DOMAINS')!.split(',')
const router = new Router()

router.get('/', (context) => {
  context.response.body = 'hello world'
})

router.post('/webhook/line', async (context) => {
  const key = context.request.url.searchParams.get('key')
  if (key !== expectedKey) {
    log.warning('Invalid key received from', context.request.ip)
    context.response.status = 403
    context.response.body = 'Forbidden'
    return
  }

  const body = await context.request.body({ type: 'json' }).value

  await handleEvents(body.events)

  context.response.body = 'ok'
})

router.post('/inject', async (context) => {
  if (!Deno.env.get('FIREBASE_DATABASE_EMULATOR_HOST')) {
    log.warning(
      'Tried to inject message in production mode',
      context.request.ip,
    )
    context.response.status = 403
    context.response.body = 'Forbidden'
    return
  }

  const body = await context.request.body({ type: 'json' }).value
  const uid = body.uid
  const message = body.message
  if (!uid || !message) {
    context.response.status = 400
    context.response.body = 'Bad request'
    return
  }

  const result = await handle(
    {
      userId: uid,
      text: message,
      time: Date.now(),
    },
    { resolveDisplayName: async (userId) => 'Test user - ' + userId },
  )
  context.response.body = result
})

async function handleEvents(events: any[]) {
  for (const event of events) {
    try {
      switch (event.type) {
        case 'message':
          await handleMessageEvent(event)
          break
      }
    } catch (error) {
      log.error(error)
    }
  }
}

async function handleMessageEvent(event: any) {
  switch (event.message.type) {
    case 'text':
      await handleTextMessage(event)
      break
  }
}

async function handleTextMessage(event: any) {
  const text = event.message.text.trim()
  const replyToken = event.replyToken
  const time = event.timestamp
  const userId = event.source.userId
  const url = `https://api.line.me/v2/bot/message/reply`
  const result = await handle(
    {
      userId,
      text,
      time,
    },
    {
      resolveDisplayName: async (userId) => {
        const profile = (await ky
          .get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: {
              Authorization: `Bearer ${channelAccessToken}`,
            },
          })
          .json()) as any
        return profile.displayName
      },
    },
  )
  log.info(`${userId} "${text}" => "${result}"`)
  const response = await ky.post(url, {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
    json: {
      replyToken,
      messages: [
        {
          type: 'text',
          text: result,
        },
      ],
    },
  })
  void response
}

const app = new Application()

// Deno Deploy does not currently provide the ability to delete old deployments.
// As a workaround, we check the domain name of the request and reject it if it
// is not the production domain.
app.use(async (context, next) => {
  const host = context.request.headers.get('host')
  if (host && allowedDomains.includes(host)) {
    await next()
  } else {
    context.response.status = 403
    context.response.body = `you can only access via production domain. domain "${host}" is not allowed.`
  }
})

app.use(router.routes())
app.use(router.allowedMethods())
app.addEventListener('listen', () => {
  log.info(`Listening on port ${port}...`)
})
await app.listen({ port })
