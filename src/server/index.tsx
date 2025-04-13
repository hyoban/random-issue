import { Hono } from 'hono'

import route from './api'
import { renderer } from './renderer'

const app = new Hono()

app.route('/', route)

app.use(renderer)
app.get('/', (c) => {
  return c.render(
    <main className="h-full flex flex-col items-center pt-10 gap-4">
      <h1 className="text-3xl font-bold">Random Issue</h1>
      <p>Pick a random issue by username or repository name</p>
      <p>Example: <a href="/RSSNext/Folo" className="underline">RSSNext/Folo</a></p>
      <div id="root" />
    </main>,
  )
})

export default app
