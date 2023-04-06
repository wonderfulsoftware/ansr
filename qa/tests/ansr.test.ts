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
})

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
