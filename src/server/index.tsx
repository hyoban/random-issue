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
  user: z.string().regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i),
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

const examples = [
  'RSSNext/Folo',
  'hyoban',
  'antfu',
]

app.use(renderer)
app.get('/', (c) => {
  return c.render(
    <main className="flex h-full flex-col items-center gap-4 pt-10">
      <h1 className="text-3xl font-bold">Random Issue</h1>
      <p>Pick a random issue by username or repository name</p>
      <p className="flex gap-2">
        Example:
        {examples.map(example => (
          <a
            key={example}
            href={`/${example}`}
            className="underline"
          >
            {example}
          </a>
        ))}
      </p>
      <div className="flex gap-2">
        <a
          href="https://github.com/hyoban/random-issue"
          target="_blank"
          rel="noopener noreferrer"
          className="i-simple-icons-github"
        >
          GitHub
        </a>
        <a
          href="https://x.com/hyoban_cc/status/1911612034124550407"
          target="_blank"
          rel="noopener noreferrer"
          className="i-simple-icons-x"
        >
          X
        </a>
      </div>
      <div id="root" />
    </main>,
  )
})

export default app
