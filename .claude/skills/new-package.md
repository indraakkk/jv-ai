# Create @jackson-ventures/* Workspace Package

## When to use

When creating a new shared library package under `packages/` that will be consumed by services or other packages via the `@jackson-ventures/*` scope.

## Steps

1. **Check root package.json** for the workspace scope name:
   ```bash
   rtk cat package.json | rtk head -20
   ```

2. **Create package directory and package.json**:
   ```bash
   rtk mkdir -p packages/<name>/src
   ```

   Create `packages/<name>/package.json`:
   ```json
   {
     "name": "@jackson-ventures/<name>",
     "version": "0.0.1",
     "type": "module",
     "exports": {
       ".": "./src/index.ts"
     },
     "dependencies": {},
     "devDependencies": {}
   }
   ```

3. **Create tsconfig.json** extending root config:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src"]
   }
   ```

4. **Create entry point** at `packages/<name>/src/index.ts`:
   ```typescript
   // @jackson-ventures/<name> - brief description
   ```

5. **Add to root workspace** — Check root `package.json` workspaces field. The package should be auto-discovered if `packages/*` is in the workspaces glob.

6. **Install to link the package**:
   ```bash
   rtk bun install
   ```

7. **Import in consuming packages** as:
   ```typescript
   import { Something } from "@jackson-ventures/<name>"
   ```

8. **Update `.gitignore`** if the package produces new file types or build artifacts (e.g., `dist/`).

## Notes

- Follow import order: builtins → external → Effect → @jackson-ventures/* → relative
- File naming: `kebab-case.ts` for files
- No explicit `any` — use proper types
- If `bun.lock` changes: `rtk bun2nix -l bun.lock -o bun.lock.nix`
- Check existing packages for reference patterns
