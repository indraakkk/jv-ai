import { Context, Effect, Layer, pipe } from "effect"
import { CollectionError, type RawCompanyInput } from "@jackson-ventures/shared"
import { collectFromGitHub } from "./sources/github"
import { seedCompanies } from "./sources/seed"

export class CollectorService extends Context.Tag("CollectorService")<
  CollectorService,
  {
    readonly collectFromGitHub: (
      count: number,
    ) => Effect.Effect<ReadonlyArray<RawCompanyInput>, CollectionError>
    readonly collectFromSeed: () => Effect.Effect<
      ReadonlyArray<RawCompanyInput>,
      never
    >
    readonly collectAll: (
      minCount: number,
    ) => Effect.Effect<ReadonlyArray<RawCompanyInput>, CollectionError>
  }
>() {}

export const CollectorServiceLive = Layer.succeed(CollectorService, {
  collectFromGitHub: (count: number) =>
    pipe(
      collectFromGitHub(count),
      Effect.retry({ times: 2 }),
    ),

  collectFromSeed: () => Effect.succeed(seedCompanies),

  collectAll: (minCount: number) =>
    pipe(
      collectFromGitHub(minCount),
      Effect.catchAll(() => {
        console.log(
          "GitHub API unavailable, falling back to seed data",
        )
        return Effect.succeed([] as ReadonlyArray<RawCompanyInput>)
      }),
      Effect.flatMap((githubCompanies) => {
        if (githubCompanies.length >= minCount) {
          return Effect.succeed(githubCompanies)
        }
        const needed = minCount - githubCompanies.length
        const supplement = seedCompanies.slice(0, needed)
        return Effect.succeed([...githubCompanies, ...supplement])
      }),
    ),
})
