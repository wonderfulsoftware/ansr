import type { WebhookRequestBody, MessageEvent } from '@line/bot-sdk'
import { Client } from '@line/bot-sdk'
import * as logger from 'firebase-functions/logger'
import { handle } from './logic'
import axios from 'axios'
import { env } from './env'
import { handleAxiosError } from './handleAxiosError'

function getClient() {
  return new Client({ channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN })
}

export async function handleLineWebhook({ events }: WebhookRequestBody) {
  for (const event of events) {
    try {
      switch (event.type) {
        case 'message':
          await handleMessageEvent(event)
          break
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

async function handleMessageEvent(event: MessageEvent) {
  switch (event.message.type) {
    case 'text':
      await handleTextMessage(event)
      break
  }
}

async function handleTextMessage(event: MessageEvent) {
  if (event.message.type !== 'text') {
    throw new Error(`Unexpected message type: ${event.message.type}`)
  }
  const text = event.message.text.trim()
  const replyToken = event.replyToken
  const time = event.timestamp
  const userId = event.source.userId
  if (!userId) {
    throw new Error(`Missing userId`)
  }
  const url = `https://api.line.me/v2/bot/message/reply`
  const result = await handle(
    {
      userId,
      text,
      time,
    },
    {
      resolveDisplayName: async (userId) => {
        const profile = (
          await axios
            .get(`https://api.line.me/v2/bot/profile/${userId}`, {
              headers: {
                Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
            })
            .catch(handleAxiosError('Unable to get profile'))
        ).data
        return profile.displayName
      },
      onJoin: async () => {
        await getClient().linkRichMenuToUser(
          userId,
          await getInsideRichMenuId(),
        )
      },
      onLeave: async () => {
        await getClient().unlinkRichMenuFromUser(userId)
      },
    },
  )
  logger.info(`${userId} "${text}" => "${result}"`)
  const response = await axios
    .post(
      url,
      {
        replyToken,
        messages: [
          {
            type: 'text',
            text: result,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    )
    .catch(handleAxiosError('Unable to reply'))
  void response
}

let cachedInsideRichMenuPromise: Promise<string> | undefined

async function getInsideRichMenuId() {
  if (cachedInsideRichMenuPromise) {
    return cachedInsideRichMenuPromise
  }
  cachedInsideRichMenuPromise = (async () => {
    const client = getClient()
    const richMenus = await client.getRichMenuList()
    const insideRichMenu = richMenus
      .filter((m) => m.name.startsWith('inside-'))
      .sort((a, b) => b.name.localeCompare(a.name))[0]
    if (!insideRichMenu) {
      throw new Error(`No inside rich menu found`)
    }
    setTimeout(() => {
      cachedInsideRichMenuPromise = undefined
    }, 1000 * 60)
    return insideRichMenu.richMenuId
  })()
  return cachedInsideRichMenuPromise
}
