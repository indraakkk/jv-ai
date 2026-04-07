# Data Domain Layer

## When to use

When working with database operations or data services.

## Drizzle ORM

**SQL-like syntax only** — never relational query syntax:
```typescript
db.select().from(user).where(eq(user.id, id)).innerJoin(...)
```

Transactions for multi-ops:
```typescript
await db.transaction(async (tx) => { ... });
```

## Schema Rules

- Primary key: `uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())`
- Enums: `pgEnum` always, never plain text
- Foreign key refs: use appropriate `onDelete` behavior (e.g., `{ onDelete: 'restrict' }`)

## Key Patterns

- Schema definitions in `src/db/` or similar
- Business logic in `src/services/`
- Use Effect-TS for async operations and error handling
- Use branded types for domain identifiers

## Migration Commands

```bash
rtk bun --filter app drizzle:generate
rtk bun --filter app drizzle:migrate
rtk bun --filter app drizzle:studio
```
