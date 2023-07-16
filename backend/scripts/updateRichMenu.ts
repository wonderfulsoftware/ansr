import 'dotenv/config'
import { Client } from '@line/bot-sdk'
import { env } from '../src/env'
import { readFileSync } from 'fs'

const client = new Client({ channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN })

async function main() {
  console.log('Deploying rich menu...')

  const outsideId = await client.createRichMenu({
    size: {
      width: 2500,
      height: 843,
    },
    selected: true,
    name: 'outside-' + Date.now(),
    chatBarText: 'Welcome',
    areas: [],
  })
  await client.setRichMenuImage(
    outsideId,
    readFileSync('res/rich-menu/outside.png'),
  )
  await client.setDefaultRichMenu(outsideId)
  console.log('[outside] Rich menu created', outsideId)

  const insideId = await client.createRichMenu({
    size: {
      width: 2500,
      height: 843,
    },
    selected: true,
    name: 'inside-' + Date.now(),
    chatBarText: 'Submit answer',
    areas: [
      {
        bounds: { x: 1116, y: 63, width: 583, height: 146 },
        action: { type: 'message', text: '.roominfo' },
      },
      {
        bounds: { x: 1795, y: 63, width: 640, height: 146 },
        action: { type: 'message', text: '.leave' },
      },
      {
        bounds: { x: 156, y: 269, width: 475, height: 475 },
        action: { type: 'message', text: '1' },
      },
      {
        bounds: { x: 727, y: 269, width: 475, height: 475 },
        action: { type: 'message', text: '2' },
      },
      {
        bounds: { x: 1298, y: 269, width: 475, height: 475 },
        action: { type: 'message', text: '3' },
      },
      {
        bounds: { x: 1869, y: 269, width: 475, height: 475 },
        action: { type: 'message', text: '4' },
      },
    ],
  })
  await client.setRichMenuImage(
    insideId,
    readFileSync('res/rich-menu/inside.png'),
  )
  console.log('[inside] Rich menu created', insideId)
}

main()
