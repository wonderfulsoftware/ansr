import { test, expect, Page } from '@playwright/test'
import axios from 'axios'

test('log in button is shown when not signed in', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.go()
  await expect(page.locator('body')).toContainText('Login with LINE')
})

test('can sign in', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.login('host')
  await expect(page.locator('body')).toContainText('Test user - host')
})

test('can see recent room', async ({ page }) => {
  const app = new AnsrApp(page)
  await app.login('host' + new Date().getTime())
  const room = await app.createNewRoom()
  await app.go()
  await expect(page.locator('body')).toContainText('Recent rooms')
  await expect(page.locator('body')).toContainText(room.pin)
})

test('can see people joining', async ({ page }) => {
  const app = new AnsrApp(page)
  const room = await app.setupRoom()
  await room.seeUsers()
  await line('guest1', room.pin)
  await line('guest2', room.pin)
  await line('guest3', room.pin)
  await HACK_reload(page)
  await expect(page.locator('body')).toContainText('guest1')
  await expect(page.locator('body')).toContainText('guest2')
  await expect(page.locator('body')).toContainText('guest3')
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
  await line('guest1', room.pin)
  await line('guest2', room.pin)
  await line('guest3', room.pin)
  await line('guest4', room.pin)
  await line('guest5', room.pin)

  await room.createQuestion()
  await page.getByLabel('Active & accepting answers').click()
  let attempt = 1
  await expect(async () => {
    await line('guest1', '3')
    await line('guest2', '1')
    await line('guest3', '4')
    await line('guest4', '1')
    await line('guest5', '5')
    if (attempt++ > 1) {
      await HACK_reload(page)
    }
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

async function HACK_reload(page: Page) {
  // There is a bit of problem with the emulator where things do not display in real-time
  // so we need to reload the page to see the latest state.
  await page.reload()
}

class AnsrApp {
  constructor(private page: Page) {}
  async go() {
    await this.page.goto('http://localhost:8888/?flags=test')
  }
  async login(uid: string = 'host') {
    await this.page.goto(
      `http://localhost:8888/.netlify/functions/line-login?uid=${uid}`,
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
    await HACK_reload(this.page)
  }
}

async function line(uid: string, message: string) {
  await axios
    .post(`http://127.0.0.1:4752/inject`, { uid, message })
    .catch((e: any) => {
      const data = e?.response?.data
      e.message = `${e.message} ${data}`
      throw e
    })
}
