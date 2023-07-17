import { test, expect, Page } from '@playwright/test'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../backend/src/appRouter'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://127.0.0.1:5001/demo-ansr/asia-southeast1/trpc',
    }),
  ],
})

test('log in button is shown when not signed in', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.go()
  await expect(page.locator('body')).toContainText('Login with LINE')
})

test('can sign in', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.login('tester_host')
  await expect(page.locator('body')).toContainText('Test user - tester_host')
})

test('can see recent room', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.login('tester_host' + new Date().getTime())
  const room = await app.createNewRoom()
  await app.go()
  await expect(page.locator('body')).toContainText('Recent rooms')
  await expect(page.locator('body')).toContainText(room.pin)
})

test('can see people joining', async ({ page }) => {
  const app = new AnsrApp(page)
  const room = await app.setupRoom()
  await room.seeUsers()
  await line('tester_guest1', room.pin)
  await line('tester_guest2', room.pin)
  await line('tester_guest3', room.pin)
  await expect(page.locator('body')).toContainText('tester_guest1')
  await expect(page.locator('body')).toContainText('tester_guest2')
  await expect(page.locator('body')).toContainText('tester_guest3')
})

test('can create question', async ({ page }) => {
  const app = new AnsrApp(page)
  const room = await app.setupRoom()
  await room.createQuestion()
  await expect(page.locator('body')).toContainText('#1')
  await room.createQuestion()
  await expect(page.locator('body')).toContainText('#2')
  await room.createQuestion()
  await expect(page.locator('body')).toContainText('#3')
})

test('can accept answers', async ({ page }) => {
  const app = new AnsrApp(page)
  const room = await app.setupRoom()
  await line('tester_guest1', room.pin)
  await line('tester_guest2', room.pin)
  await line('tester_guest3', room.pin)
  await line('tester_guest4', room.pin)
  await line('tester_guest5', room.pin)

  await room.createQuestion()
  await page.getByLabel('Active & accepting answers').click()
  let attempt = 1
  await expect(async () => {
    await line('tester_guest1', '3')
    await line('tester_guest2', '1')
    await line('tester_guest3', '4')
    await line('tester_guest4', '1')
    await line('tester_guest5', '5')
    await expect(page.getByText('Show answers (4)')).toBeVisible({
      timeout: 1000,
    })
  }).toPass()
  await page.getByLabel('Show answers').click()
  const bar = page.getByTestId('Answer chart bar')
  await expect(bar.nth(0)).toHaveAttribute('aria-label', '2 people answered 1')
  await expect(bar.nth(1)).toHaveAttribute('aria-label', 'No one answered 2')
  await expect(bar.nth(2)).toHaveAttribute('aria-label', '1 person answered 3')
  await expect(bar.nth(3)).toHaveAttribute('aria-label', '1 person answered 4')
})

class AnsrApp {
  constructor(private page: Page) {}
  async go() {
    await this.page.goto('http://localhost:47522/?flags=test')
  }
  async login(uid: string = 'tester_host') {
    await this.page.goto(
      `http://localhost:47522/?flags=test&code=${uid}&state=test#/auth/callback`,
    )
  }
  async createNewRoom() {
    await this.page.getByRole('button', { name: 'Create a new room' }).click()
    const pinLocator = this.page.getByTestId('Room PIN')
    await expect(pinLocator).toContainText(/[0-9]{6}/)
    const pin = (await pinLocator.innerText()).trim()
    return new AnsrRoom(this.page, pin)
  }
  async setupRoom() {
    await this.login()
    const room = await this.createNewRoom()
    return room
  }
}

class AnsrRoom {
  constructor(private page: Page, public pin: string) {}
  async seeUsers() {
    await this.page.getByRole('link', { name: 'Users' }).click()
  }
  async createQuestion() {
    await this.page.getByRole('button', { name: 'Create new question' }).click()
    await expect(this.page.locator('body')).toContainText('Question #')
  }
}

async function line(uid: string, message: string) {
  await trpc.testing.injectMessage.mutate({ uid, message })
}
