import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { validator } from 'hono/validator'
import { z } from 'zod'

import { getWatchedRepository } from './lib'

const app = new Hono()

const schema = z.object({
  user: z.string(),
})

const route = app.get(
  '/api/repos/:user',
  validator('param', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      return c.text('Invalid parameters', 400)
    }
    return parsed.data
  }),
  async (c) => {
    const { GITHUB_TOKEN } = env<{ GITHUB_TOKEN: string }>(c)
    const { user } = c.req.valid('param')
    const watchedRepos = await getWatchedRepository({ user, GITHUB_TOKEN })

    return c.json(watchedRepos)
  },
)

export default route
export type AppType = typeof route
