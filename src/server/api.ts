import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { validator } from 'hono/validator'
import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'
import { z } from 'zod'

const app = new Hono()

const schema = z.object({
  user: z.string(),
  repo: z.string().optional(),
})

const storage = createStorage({
  driver: lruCacheDriver({
    ttl: 1000 * 60 * 60 * 1,
  }),
})

function random(data: string[]) {
  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex]
}

async function getRandomWatchedRepository(user: string, GITHUB_TOKEN: string) {
  const cached = await storage.get<string[]>(`${user}:watched-repos`)
  if (cached) {
    return random(cached)
  }
  let page = 1
  let watchedRepos: string[] = []

  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${user}/subscriptions?page=${page}`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Hono',
        },
      },
    )
    const data = (await res.json()) as Array<{
      full_name: string
    }>
    if (data.length === 0) {
      break
    }
    watchedRepos = [...watchedRepos, ...data.map(d => d.full_name)]
    page++
  }
  await storage.set(`${user}:watched-repos`, JSON.stringify(watchedRepos))
  return random(watchedRepos)
}

async function getRandomIssue(fullRepo: string, GITHUB_TOKEN: string) {
  const allOpenIssues = await storage.get<string[]>(`${fullRepo}:issues`)
  if (allOpenIssues) {
    const randomIndex = Math.floor(Math.random() * allOpenIssues.length)
    return allOpenIssues[randomIndex]
  }
  let page = 1
  let allIssues: string[] = []
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${fullRepo}/issues?state=open&page=${page}`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Hono',
        },
      },
    )
    const data = (await res.json()) as Array<{
      html_url: string
    }>
    if (data.length === 0) {
      break
    }
    allIssues = [...allIssues, ...data.map(d => d.html_url)]
    page++
  }
  await storage.set(`${fullRepo}:issues`, JSON.stringify(allIssues))
  const randomIndex = Math.floor(Math.random() * allIssues.length)
  return allIssues[randomIndex]
}

const route = app.get(
  '/:user/:repo',
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

    const fullRepo = repo ? `${user}/${repo}` : await getRandomWatchedRepository(user, GITHUB_TOKEN)

    const issueURL = await getRandomIssue(fullRepo, GITHUB_TOKEN)
    return c.redirect(issueURL, 302)
  },
)

export default route
export type AppType = typeof route
