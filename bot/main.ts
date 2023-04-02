import { Application, Router } from 'https://deno.land/x/oak@v12.1.0/mod.ts'
import * as log from 'https://deno.land/std@0.182.0/log/mod.ts'

const port = +Deno.env.get('PORT')! || 4752
const expectedKey = Deno.env.get('LINE_WEBHOOK_SECRET_KEY')!
const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
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
  log.info(`=> ${JSON.stringify(body, null, 2)}`)

  await handleEvents(body.events)

  context.response.body = 'ok'
})

async function handleEvents(events: any[]) {
  for (const event of events) {
    switch (event.type) {
      case 'message':
        await handleMessageEvent(event)
        break
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
  const text = event.message.text
  const replyToken = event.replyToken
  const userId = event.source.userId
  const url = `https://api.line.me/v2/bot/message/reply`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text: `You said: ${text}`,
        },
      ],
    }),
  })
  if (!response.ok) {
    log.error(
      `Failed to reply to ${userId}: ${response.status} ${response.statusText}`,
    )
  }
}

const app = new Application()
app.use(router.routes())
app.use(router.allowedMethods())
app.addEventListener('listen', () => {
  log.info(`Listening on port ${port}...`)
})
await app.listen({ port })
