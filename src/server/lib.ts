import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

const storage = createStorage({
  driver: lruCacheDriver({
    ttl: 1000 * 60 * 60 * 1,
  }),
})

export function random(data: string[]) {
  if (data.length === 0) {
    return null
  }
  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex]
}

export async function getWatchedRepository(user: string, GITHUB_TOKEN: string) {
  const cached = await storage.get<string[]>(`${user}:watched-repos`)
  if (cached) {
    return cached
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
      private: boolean
      open_issues: number
      archived: boolean
    }>
    if (data.length === 0) {
      break
    }
    watchedRepos = [
      ...watchedRepos,
      ...data.filter(d => !d.private && d.open_issues > 0 && !d.archived).map(d => d.full_name),
    ]
    page++
  }
  await storage.set(`${user}:watched-repos`, JSON.stringify(watchedRepos))
  return watchedRepos
}

export async function getOpenIssues(fullRepo: string, GITHUB_TOKEN: string) {
  const allOpenIssues = await storage.get<string[]>(`${fullRepo}:open_issues`)
  if (allOpenIssues) {
    return allOpenIssues
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
      pull_request?: Record<string, unknown>
    }>
    if (data.length === 0) {
      break
    }
    allIssues = [...allIssues, ...data.map(d => d.html_url)]
    page++
  }
  await storage.set(`${fullRepo}:open_issues`, JSON.stringify(allIssues))
  return allIssues
}
