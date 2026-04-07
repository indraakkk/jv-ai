# Effect-TS Patterns

## When to use

When implementing services, async operations, or domain modeling with Effect-TS.

## Import Order

```typescript
// 1. Node/Bun builtins
import { readFile } from "node:fs/promises";
// 2. External dependencies
import { z } from "zod";
// 3. Effect-TS modules
import { Effect, Layer, pipe, Schema } from "effect";
// 4. Workspace packages
import { logger } from "@jackson-ventures/utils";
// 5. Relative imports
import { UserService } from "./user-service";
```

## Layer Composition (DI)

```typescript
// Define service interface
class UserRepo extends Effect.Tag("UserRepo")<
  UserRepo,
  {
    readonly findById: (id: string) => Effect.Effect<User, NotFoundError>;
    readonly create: (data: CreateUser) => Effect.Effect<User>;
  }
>() {}

// Implement
const UserRepoLive = Layer.succeed(UserRepo, {
  findById: (id) => pipe(
    Effect.tryPromise(() => db.select().from(user).where(eq(user.id, id))),
    Effect.map(rows => rows[0]),
    Effect.flatMap(Effect.fromNullable),
    Effect.mapError(() => new NotFoundError({ entity: "User", id }))
  ),
  create: (data) => Effect.tryPromise(() =>
    db.insert(user).values(data).returning()
  ).pipe(Effect.map(rows => rows[0]))
});
```

## Pipe Composition

```typescript
const getUser = (id: string) => pipe(
  UserRepo,
  Effect.flatMap(repo => repo.findById(id)),
  Effect.tap(user => Effect.log(`Found user: ${user.name}`)),
  Effect.catchTag("NotFoundError", () => Effect.fail(new HttpError(404)))
);
```

## Branded Types

```typescript
const UserId = Schema.String.pipe(Schema.brand("UserId"));
type UserId = Schema.Schema.Type<typeof UserId>;

const EmailAddress = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/),
  Schema.brand("EmailAddress")
);
```

## Schema Validation

```typescript
const CreateUserSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  email: EmailAddress,
});

const parseCreateUser = Schema.decodeUnknown(CreateUserSchema);
```

## Effect Solutions CLI

```bash
rtk bunx effect-solutions list           # List all topics
rtk bunx effect-solutions show <slug>    # Read a topic
rtk bunx effect-solutions search <term>  # Search topics
```

Local source: `~/.local/share/effect-solutions/effect`
