import { HttpServer } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer, pipe } from "effect"
import {
  DatabaseServiceLive,
  CompanyRepositoryLive,
} from "@jackson-ventures/db"
import { CollectorServiceLive } from "@jackson-ventures/collector"
import { AiServiceLive } from "@jackson-ventures/ai-agent"
import { app } from "./app"

const port = Number(process.env.PORT ?? 3000)

const ServerLayer = BunHttpServer.layer({ port })

const AppServicesLayer = pipe(
  Layer.mergeAll(CompanyRepositoryLive, AiServiceLive, CollectorServiceLive),
  Layer.provide(DatabaseServiceLive),
)

const HttpLayer = pipe(
  HttpServer.serve(app),
  Layer.provide(ServerLayer),
  Layer.provide(AppServicesLayer),
)

console.log(`Starting server on http://localhost:${port}`)

BunRuntime.runMain(Layer.launch(HttpLayer))
