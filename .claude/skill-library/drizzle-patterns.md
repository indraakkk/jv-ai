# Drizzle ORM Patterns

## When to use

When working with database schemas, queries, or migrations.

## Query Syntax

**ALWAYS use SQL-like syntax:**
```typescript
const users = await db
  .select()
  .from(user)
  .where(eq(user.email, email))
  .innerJoin(profile, eq(user.id, profile.userId));
```

**NEVER use relational syntax:**
```typescript
// WRONG — do not use this pattern
const users = await db.query.user.findMany({
  with: { profile: true }
});
```

## Table Creation

### Primary Key
```typescript
uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())
```

### Enums
Always use `pgEnum` for fixed value sets:
```typescript
export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);
// Use in column:
status: statusEnum('status').notNull().default('active')
```
**Never** use plain `text` for enum columns.

## Foreign Key Constraints

Use appropriate `onDelete` behavior for foreign keys:
```typescript
uuid('file_id').references(() => file.id, { onDelete: 'restrict' })
```

## Transactions

Always wrap multiple operations:
```typescript
await db.transaction(async (tx) => {
  const [newUser] = await tx.insert(user).values({ ... }).returning();
  await tx.insert(profile).values({ userId: newUser.id, ... });
});
```

## Migration Workflow

```bash
rtk bun --filter app drizzle:generate    # Generate migration
rtk bun --filter app drizzle:migrate     # Run migration
rtk bun --filter app drizzle:studio      # Inspect in browser
```
