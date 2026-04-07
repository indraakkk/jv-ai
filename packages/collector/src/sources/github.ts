import { Effect, pipe } from "effect"
import { CollectionError, type RawCompanyInput } from "@jackson-ventures/shared"

interface GitHubRepo {
  full_name: string
  description: string | null
  html_url: string
  owner: {
    login: string
    type: string
    html_url: string
  }
  homepage: string | null
}

interface GitHubOrg {
  login: string
  name: string | null
  description: string | null
  blog: string | null
  html_url: string
  company: string | null
}

interface GitHubSearchResponse {
  items: ReadonlyArray<GitHubRepo>
}

const GITHUB_API = "https://api.github.com"

const fetchJson = <T>(url: string): Effect.Effect<T, CollectionError> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "jackson-ventures-collector",
        },
      })
      if (!res.ok) {
        throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
      }
      return (await res.json()) as T
    },
    catch: (cause) => new CollectionError({ source: "github", cause }),
  })

const fetchOrgInfo = (login: string): Effect.Effect<GitHubOrg | null, CollectionError> =>
  pipe(
    fetchJson<GitHubOrg>(`${GITHUB_API}/orgs/${login}`),
    Effect.catchAll(() => Effect.succeed(null)),
  )

const repoToCompany = (
  repo: GitHubRepo,
  org: GitHubOrg | null,
): RawCompanyInput => ({
  companyName: org?.name ?? org?.login ?? repo.owner.login,
  website: org?.blog ?? repo.homepage ?? repo.owner.html_url,
  description:
    org?.description ?? repo.description ?? `Open-source project: ${repo.full_name}`,
  source: "github",
})

export const collectFromGitHub = (
  count: number,
): Effect.Effect<ReadonlyArray<RawCompanyInput>, CollectionError> =>
  pipe(
    fetchJson<GitHubSearchResponse>(
      `${GITHUB_API}/search/repositories?q=stars:>5000&sort=stars&per_page=${Math.min(count * 2, 30)}`,
    ),
    Effect.flatMap((response) => {
      const orgRepos = response.items.filter(
        (r) => r.owner.type === "Organization",
      )
      const uniqueOrgs = new Map<string, GitHubRepo>()
      for (const repo of orgRepos) {
        if (!uniqueOrgs.has(repo.owner.login)) {
          uniqueOrgs.set(repo.owner.login, repo)
        }
      }
      const repos = Array.from(uniqueOrgs.values()).slice(0, count)

      return Effect.all(
        repos.map((repo) =>
          pipe(
            fetchOrgInfo(repo.owner.login),
            Effect.map((org) => repoToCompany(repo, org)),
          ),
        ),
        { concurrency: 3 },
      )
    }),
  )
