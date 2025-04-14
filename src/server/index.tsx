import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { validator } from 'hono/validator'
import { z } from 'zod'

import apiRoute from './api'
import { getOpenIssues, getWatchedRepository, random } from './lib'
import { renderer } from './renderer'

const app = new Hono()

app.route('/', apiRoute)

const schema = z.object({
  user: z.string(),
  repo: z.string().optional(),
})

app.get(
  '/:user/:repo?',
  validator('param', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      return c.text('Invalid parameters', 400)
    }
    return parsed.data
  }),
  async (c) => {
    const { GITHUB_TOKEN } = env<{ GITHUB_TOKEN: string }>(c)
    const { user, repo } = c.req.valid('param')

    const fullRepo = repo ? `${user}/${repo}` : random(await getWatchedRepository({ user, GITHUB_TOKEN }))
    if (!fullRepo) {
      return c.text('No watched repositories found', 404)
    }

    const issueURL = random(await getOpenIssues(fullRepo, GITHUB_TOKEN))

    if (!issueURL) {
      return c.text(`No open issues found for ${fullRepo}`, 404)
    }
    return c.redirect(issueURL, 302)
  },
)

app.use(renderer)
app.get('/', (c) => {
  return c.render(
    <main className="h-full flex flex-col items-center pt-10 gap-4">
      <h1 className="text-3xl font-bold">Random Issue</h1>
      <p>Pick a random issue by username or repository name</p>
      <p>
        Example:
        {' '}
        <a href="/RSSNext/Folo" className="underline">RSSNext/Folo</a>
        {' '}
        <a href="/hyoban" className="underline">hyoban</a>
      </p>
      <div id="root" />
    </main>,
  )
})

export default app
