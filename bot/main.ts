import { Application, Router } from 'https://deno.land/x/oak@v12.1.0/mod.ts'

const port = +Deno.env.get('PORT')! || 4752
const router = new Router()
router.get('/', (context) => {
  context.response.body = 'hello world'
})

const app = new Application()
app.use(router.routes())
app.use(router.allowedMethods())
app.addEventListener('listen', () => {
  console.log(`Listening on port ${port}...`)
})
await app.listen({ port })
