import { hc } from 'hono/client'
import { useActionState } from 'react'

import type { AppType } from '../server/api'

const client = hc<AppType>('/')

async function fetchData(user: string) {
  const data = await client.api.repos[':user']['$get']({ param: { user } })
  return data.json()
}

export default function App() {
  const [repos, submitAction, isPending] = useActionState(
    async (_previousState: string[] | null, formData: FormData) => {
      const user = formData.get('user')
      if (typeof user !== 'string') {
        return null
      }
      const repos = await fetchData(user)
      if (repos) {
        return repos
      }
      return null
    },
    null,
  )

  return (
    <>
      <form action={submitAction} className="max-w-xl flex flex-col items-center my-2">
        <div className="flex gap-2">
          <input
            type="text"
            name="user"
            placeholder="GitHub username"
            className="border px-2 py-1 rounded"
            autoComplete="off"
            data-1p-ignore
          />
          <button
            type="submit"
            disabled={isPending}
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </form>
      {
        isPending ? (
          <div className="flex items-center justify-center my-4">
            <div className="i-mingcute-loading-3-fill animate-spin" />
          </div>
        ) : (
          <ul className="flex flex-col gap-2 font-mono my-4 text-sm">
            {repos?.map(repo => (
              <li key={repo} className="underline">
                <a href={`/${repo}`} target="_blank" rel="noopener noreferrer">
                  {repo}
                </a>
              </li>
            ))}
          </ul>
        )
      }
    </>
  )
}
