# Jackson Ventures Infrastructure & Development Environment

## Nix Flake Setup

**File**: flake.nix

### Inputs
```nix
{
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  flake-parts.url = "github:hercules-ci/flake-parts";
  llm-agents.url = "github:numtide/llm-agents.nix";
  serena.url = "github:oraios/serena";
}
```

### Supported Systems
- aarch64-darwin (M1/M2 Mac)
- aarch64-linux (Linux ARM)
- x86_64-linux (Linux x86)

### Dev Shell Configuration

**File**: nix/dev.nix

**BuildInputs** (available in `nix develop`):
- `pkgs.bun` — JavaScript runtime
- `pkgs.nodejs_22` — Node.js 22 (for compatibility)
- `pkgs.postgresql_16` — PostgreSQL client tools + server
- `inputs'.llm-agents.packages.rtk` — CLI tool prefix
- `inputs'.serena.packages.default` — Code intelligence
- `pkgs.git` — Version control

**Shell Hook** (auto-runs on `nix develop`):
Displays versions of available tools (bun, node, psql, rtk).

## PostgreSQL Docker Compose

**File**: docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: jackson_ventures
      POSTGRES_USER: jackson
      POSTGRES_PASSWORD: jackson_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jackson -d jackson_ventures"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### Commands
```bash
docker-compose up -d          # Start PostgreSQL (background)
docker-compose down           # Stop PostgreSQL
docker-compose logs -f        # View logs
```

### Connection String
```
postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures
```

## Environment Variables

**File**: .env (git-ignored)

```
DATABASE_URL=postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
PORT=3000
```

**File**: .env.example (for reference)
Same as above but with placeholder values.

### Required Variables
- `DATABASE_URL`: PostgreSQL connection (must be running)
- `OPENROUTER_API_KEY`: OpenRouter API key (free tier supported)

### Optional Variables
- `OPENROUTER_MODEL`: LLM model (default: nvidia/nemotron-3-super-120b-a12b:free)
- `PORT`: API server port (default: 3000)

## Development Workflow

### Initial Setup
```bash
nix flake update                        # Update flake lock file
nix develop                             # Enter devshell (loads tools)
bun install                             # Install workspace dependencies
docker-compose up -d                   # Start PostgreSQL
bun --filter @jackson-ventures/db drizzle:migrate  # Apply DB migrations
```

### Running Services
```bash
# Terminal 1: API server (port 3000)
bun run --watch services/api/src/index.ts

# Terminal 2: Web UI (port 3001)
bun run --watch services/web/src/server.ts

# Terminal 3: (optional) Drizzle Studio
bun --filter @jackson-ventures/db drizzle:studio
```

### Type Checking & Testing
```bash
rtk bunx tsc --noEmit    # Full workspace type check
rtk bun test             # Run all tests
rtk nix flake check . --no-build  # Validate Nix setup
```

## Pre-Commit Hooks

**Location**: .claude/hooks/ (auto-run before commits)

### Hooks Configured
1. **verify-import-order.sh**: Validates TypeScript import ordering (builtins → external → effect → @jackson-ventures → relative)
2. **require-rtk.sh**: Ensures all bash commands use rtk prefix (example: `rtk git add`)
3. **verify-db-constraints.sh**: Validates Drizzle foreign key constraints
4. **block-nix-build.sh**: Prevents expensive `nix build` (use `nix eval` instead)
5. **auto-nix-eval.sh**: Validates Nix files with `nix eval`

**Bypass** (not recommended):
```bash
git commit --no-verify    # Skip hooks (use only in emergencies)
```

## CI/Build Strategy

### Local Verification
```bash
rtk bun install         # Install deps
rtk bunx tsc --noEmit   # Type check (must pass)
rtk bun test            # Tests (must pass)
rtk nix flake check . --no-build  # Nix validation
```

### No Docker Build Locally
Only use `nix eval` (0.1-0.3s), never `nix build` (minutes).

## Deployment Considerations

The project is built for **local dev + testing**. For production deployment:
1. Compile TypeScript → JavaScript
2. Build Nix closure for reproducible environment
3. Container image (Dockerfile recommended for production)
4. PostgreSQL remote instance (or managed service)
5. Secrets management (env vars, .env not in repo)

## Direnv (Optional)

**File**: .envrc

```bash
#!/usr/bin/env bash
use flake
```

If you have direnv installed:
```bash
direnv allow              # Loads .envrc on cd
cd /path/to/jackson-ventures  # Auto-enters nix develop
```

**Without direnv**, manually run:
```bash
nix develop
```

## Tools Reference

### rtk (rapid toolkit)
Prefix for all shell commands:
```bash
rtk git status
rtk bun install
rtk bun test
rtk bunx tsc --noEmit
rtk nix eval .
```

**Why**: Ensures all commands run within the nix devshell context.

### serena
Code intelligence, symbol navigation:
```bash
serena find-symbol MyClass
serena list-dir .
serena search-for-pattern "Effect\\.flatMap"
```

## Troubleshooting

### "Command not found: bun"
```bash
nix develop
# Now bun should be available
```

### "Postgres connection failed"
```bash
docker-compose up -d
docker-compose logs postgres  # Check logs
# Wait for healthcheck to pass
```

### "Type errors after merge"
```bash
rtk bunx tsc --noEmit
# Fix any import ordering or type issues
```

### "Pre-commit hook failed"
Common failures:
1. Import order (run /gateway-ts for fixes)
2. rtk prefix missing (add rtk: to bash commands)
3. DB constraints violated (check CLAUDE.md Drizzle Rules)

Fix and retry:
```bash
rtk git add <fixed-files>
rtk git commit -m "Fix: ..."
```
