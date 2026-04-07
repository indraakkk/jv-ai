# Effect-TS Service Pattern

## When to use

When creating or modifying Effect-TS services, layers, or any code using the Effect ecosystem. Follow these patterns for consistency across the codebase.

## Steps

1. **Follow import order** — strictly maintained:
   ```typescript
   // 1. Builtins
   import path from "bun:path"

   // 2. External packages
   import { someLib } from "some-external-lib"

   // 3. Effect ecosystem
   import { Effect, Layer, pipe, Context } from "effect"
   import { Schema } from "effect/Schema"

   // 4. @jackson-ventures/* workspace packages
   import { SomeUtil } from "@jackson-ventures/shared"

   // 5. Relative imports
   import { LocalThing } from "./local-thing"
   ```

2. **Define service interface** using Context.Tag:
   ```typescript
   export class MyService extends Context.Tag("MyService")<
     MyService,
     {
       readonly doSomething: (input: string) => Effect.Effect<Result, MyError>
       readonly getById: (id: string) => Effect.Effect<Item, NotFoundError>
     }
   >() {}
   ```

3. **Create branded types** for domain modeling:
   ```typescript
   import { Brand } from "effect"

   export type UserId = string & Brand.Brand<"UserId">
   export const UserId = Brand.nominal<UserId>()
   ```

4. **Implement with Layer** for dependency injection:
   ```typescript
   export const MyServiceLive = Layer.effect(
     MyService,
     Effect.gen(function* () {
       const db = yield* Database
       const config = yield* Config

       return {
         doSomething: (input) =>
           pipe(
             Effect.tryPromise(() => db.query(input)),
             Effect.mapError((e) => new MyError({ cause: e })),
           ),

         getById: (id) =>
           pipe(
             Effect.tryPromise(() => db.select().from(items).where(eq(items.id, id))),
             Effect.flatMap((rows) =>
               rows.length === 0
                 ? Effect.fail(new NotFoundError({ id }))
                 : Effect.succeed(rows[0])
             ),
           ),
       }
     }),
   )
   ```

5. **Use Schema for validation**:
   ```typescript
   import { Schema } from "effect/Schema"

   const CreateItemInput = Schema.Struct({
     name: Schema.String.pipe(Schema.minLength(1)),
     email: Schema.String.pipe(Schema.pattern(/@/)),
     role: Schema.Literal("admin", "user"),
   })

   type CreateItemInput = Schema.Schema.Type<typeof CreateItemInput>
   ```

6. **Compose layers**:
   ```typescript
   const AppLayer = Layer.mergeAll(
     MyServiceLive,
     OtherServiceLive,
   ).pipe(
     Layer.provide(DatabaseLive),
     Layer.provide(ConfigLive),
   )
   ```

7. **Use pipe for composition**:
   ```typescript
   const program = pipe(
     MyService,
     Effect.flatMap((service) => service.doSomething("input")),
     Effect.tap((result) => Effect.log(`Result: ${result}`)),
     Effect.catchTag("MyError", (e) => Effect.succeed(fallback)),
   )
   ```

## Error Handling

Define typed errors as classes:
```typescript
import { Data } from "effect"

export class MyError extends Data.TaggedError("MyError")<{
  readonly cause: unknown
  readonly message: string
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string
}> {}
```

## Rules

- No explicit `any` — use proper types everywhere
- Prefer `const` over `let`
- Use `Effect.gen` for sequential operations, `pipe` for transformations
- Use `Layer` for all dependency injection — no manual wiring
- Use `Schema` for all external input validation
- Branded types for domain identifiers (UserId, OrderId, etc.)
