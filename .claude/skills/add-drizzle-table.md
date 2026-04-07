# Add a Drizzle Table

## When to use

When creating a new database table using Drizzle ORM, or modifying an existing table schema.

## Steps

1. **Define the table** in the appropriate schema file:
   ```typescript
   import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"

   export const myTable = pgTable("my_table", {
     id: uuid("id").primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
     name: text("name").notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull(),
     updatedAt: timestamp("updated_at").defaultNow().notNull(),
   })
   ```

2. **Use `pgEnum` for fixed value sets** — never plain `text` for enums:
   ```typescript
   import { pgEnum } from "drizzle-orm/pg-core"

   export const statusEnum = pgEnum("status", ["active", "inactive", "archived"])

   // Then in table:
   status: statusEnum("status").notNull().default("active"),
   ```

3. **Foreign key constraints** — use `{ onDelete: 'restrict' }` where appropriate:
   ```typescript
   imageId: uuid("image_id").references(() => file.id, { onDelete: "restrict" }),
   ```

4. **Use SQL-like query syntax** — never relational query syntax:
   ```typescript
   // CORRECT
   db.select().from(myTable).where(eq(myTable.id, id))

   // WRONG — never use this
   db.query.myTable.findMany({ with: { ... } })
   ```

5. **Wrap multiple operations in transactions**:
   ```typescript
   await db.transaction(async (tx) => {
     await tx.insert(myTable).values(data)
     await tx.update(otherTable).set({ ... }).where(...)
   })
   ```

6. **Generate migration**:
   ```bash
   rtk bun --filter app drizzle:generate
   ```

7. **Run migration**:
   ```bash
   rtk bun --filter app drizzle:migrate
   ```

## Checklist

- [ ] Primary key uses `uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())`
- [ ] Enums use `pgEnum`, not plain `text`
- [ ] Foreign key references have appropriate `onDelete` behavior
- [ ] Queries use SQL-like syntax (`.select().from().where()`)
- [ ] Multi-operation code uses `db.transaction()`
- [ ] Migration generated and tested
