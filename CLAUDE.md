# CLAUDE.md

This file is read automatically by Claude Code when working in this repository.
Read it fully before writing any code.

---

## Project Overview

**anti-blunder-club** is a full-stack TypeScript web app for chess blunder analysis
and AI-powered coaching. Users import their chess games, identify blunders via engine
analysis, and receive coaching from Claude (Anthropic AI).

### Tech Stack

| Layer       | Technology                                                  |
| ----------- | ----------------------------------------------------------- |
| Framework   | Next.js 15+ (App Router, Server Components, Server Actions) |
| Language    | TypeScript (strict mode throughout)                         |
| Database    | PostgreSQL 16 via Prisma ORM                                |
| Auth        | Auth.js v5 (NextAuth)                                       |
| AI Coaching | Anthropic Claude API (`@anthropic-ai/sdk`)                  |
| Styling     | Tailwind CSS                                                |
| Testing     | Vitest + Testing Library                                    |
| Dev Env     | DevContainer (Node 20 + Postgres 16)                        |

---

## Critical Rules

These are non-negotiable. Never violate them.

1. **Never commit secrets.** All secrets go in `.env.local` (gitignored). Use
   `.env.example` as a committed template with placeholder values.
2. **Never import `server/` code from client components.** Files in `server/` run
   only on the server. If you need server data in a client component, use a Server
   Action or pass it as a prop from a Server Component.
3. **The `ANTHROPIC_API_KEY` must only be read in `server/ai/claude-client.ts`.**
   It must never be referenced in any other file, and never exposed to the browser.
4. **Tests are not optional.** Every new feature requires tests written before or
   alongside the implementation. See Testing Strategy below.
5. **Never run `prisma migrate dev` in CI or production.** Use `prisma migrate deploy`.
6. **Never skip pre-commit hooks** (`--no-verify`). Fix the underlying lint/type error.

---

## Repository Structure

```
app/              Next.js App Router pages and layouts
  (auth)/         Unauthenticated routes (login, register)
  (app)/          Authenticated routes (dashboard, games, profile)
  api/auth/       Auth.js v5 route handler
components/       Shared React components (client-safe)
  ui/             Primitive components (Button, Input, Card)
  chess/          Chess-domain components (ChessBoard, MoveList)
  analysis/       Blunder/coaching UI components
lib/              Isomorphic utilities (safe to import anywhere)
  chess/          PGN parsing, FEN utilities, blunder classification
  validations/    Zod schemas for user input validation
server/           Server-only code — NEVER import from client components
  auth.ts         Auth.js configuration
  db.ts           Prisma client singleton
  actions/        Next.js Server Actions
  services/       Business logic (game, blunder, analysis)
  ai/
    claude-client.ts   The ONLY file that reads ANTHROPIC_API_KEY
    prompts/           Typed prompt template functions
types/            TypeScript type declarations (no runtime code)
prisma/           Prisma schema and migrations
__tests__/        Integration and e2e tests only
```

---

## Development Workflow

### Daily Development

```bash
# Start Postgres (if not using DevContainer)
docker compose up -d

# Run the dev server
npm run dev

# Run all unit tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Lint
npm run lint
```

### Before Every Commit

Husky pre-commit hooks run automatically:

- `lint-staged` runs ESLint + Prettier on staged files

Do NOT skip hooks with `--no-verify`. Fix the root cause instead.

### Database Changes

```bash
# Create and apply a new migration (dev only)
npx prisma migrate dev --name <descriptive-name>

# After pulling changes that include new migrations
npx prisma migrate dev

# Regenerate the Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## Coding Conventions

### SOLID Principles in Practice

- **Single Responsibility**: Each file in `server/services/` handles exactly one
  domain entity. `game.service.ts` knows about games, not blunders.
- **Open/Closed**: Extend Zod schemas with `.extend()` rather than modifying the base
  schema.
- **Liskov Substitution**: Keep interfaces in `types/` honest — implement them fully.
- **Interface Segregation**: Don't pass entire DB models to functions that need 2
  fields. Define narrow input types.
- **Dependency Inversion**: Server Actions depend on service functions, not direct DB
  calls. Services depend on the Prisma singleton from `server/db.ts`.

### Naming Conventions

| Thing                  | Convention                | Example                        |
| ---------------------- | ------------------------- | ------------------------------ |
| Files (components)     | PascalCase                | `ChessBoard.tsx`               |
| Files (utils/services) | kebab-case                | `pgn-parser.ts`                |
| Types / Interfaces     | PascalCase                | `type BlunderSeverity`         |
| Zod schemas            | camelCase + Schema suffix | `gameImportSchema`             |
| Server Actions         | verb + noun               | `importGame`, `analyzeBlunder` |
| React components       | PascalCase                | `function CoachingPanel()`     |
| Custom hooks           | `use` prefix              | `useBlunderList`               |
| Constants              | SCREAMING_SNAKE_CASE      | `MAX_MOVES_PER_GAME`           |

### TypeScript Rules

- `strict: true` always. No `any` — use `unknown` and narrow it.
- Prefer `type` over `interface` for data shapes.
- All async functions return explicit `Promise<T>` types.
- Never use non-null assertion (`!`) without a comment explaining why it is safe.
- All Server Action files must have `'use server'` as the first line (file-level
  directive, not per-function).

### React / Next.js Rules

- Prefer Server Components by default. Add `'use client'` only when you need browser
  APIs, event handlers, or React state/effects.
- Pass data from Server Components to Client Components as props — never import
  `server/` code from a client component.
- Use `loading.tsx` and `error.tsx` files for route-level suspense and error
  boundaries.
- Forms must use Server Actions, not fetch calls to API routes, unless there is a
  specific reason for the API route.

---

## Testing Strategy

### Unit Tests (co-located, `*.test.ts`)

Use Vitest. Test pure functions, services, and components in isolation.

```bash
npm run test          # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

**What to unit test:**

- Every function in `lib/chess/` (pgn-parser, blunder-classifier)
- Every function in `server/services/` with a mocked Prisma client
- Every Server Action with mocked services
- React components with React Testing Library (assert on user-visible output)
- Prompt template functions in `server/ai/prompts/`

**What NOT to unit test:**

- The Prisma client itself
- Next.js routing behavior
- The Claude API directly (mock it)

### Integration Tests (`__tests__/integration/`)

Use Vitest with a real Postgres database. Test the full stack from Server Action to DB.

```bash
npm run test:integration
```

Requires `DATABASE_URL` pointing to a test database (e.g., `antiblunder_test`).

### How to Mock in Unit Tests

```typescript
// Mock Prisma in service tests
vi.mock('@/server/db', () => ({
  db: {
    game: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock Claude client in analysis service tests
vi.mock('@/server/ai/claude-client', () => ({
  generateCoaching: vi.fn().mockResolvedValue({
    explanation: 'You blundered the queen...',
    betterMove: 'Nf3',
    concept: 'Tactical awareness',
  }),
}))
```

---

## Git Worktrees Workflow

This project uses git worktrees for parallel feature development.
Each feature lives in its own worktree as a sibling directory.

### Creating a Feature Worktree

```bash
# From the main repo directory
cd /Users/dkrabapa/code/anti-blunder-club

# Create a worktree for a new feature
git worktree add ../anti-blunder-club--feat-pgn-import feat/pgn-import

# Navigate to the worktree
cd ../anti-blunder-club--feat-pgn-import

# Install dependencies (worktrees share .git but NOT node_modules)
npm install
npx prisma generate

# Set up a unique DB for this worktree to avoid migration conflicts
cp .env.example .env.local
# Edit .env.local: change POSTGRES_DB to antiblunder_feat_pgn_import
```

### Naming Convention

Worktrees live as sibling directories:

```
/Users/dkrabapa/code/
  anti-blunder-club/              ← main repo (main branch)
  anti-blunder-club--feat-auth/   ← worktree for auth feature
  anti-blunder-club--feat-pgn/    ← worktree for PGN import
  anti-blunder-club--fix-blunder/ ← worktree for a bug fix
```

Pattern: `<repo-name>--<branch-name-with-hyphens>`

### Branch Strategy

```
main      → always deployable, protected, no direct pushes
feat/*    → feature branches (one per worktree)
fix/*     → bug fixes
chore/*   → tooling, deps, config
```

Do not merge directly to main. Use pull requests. Squash merge.

### Worktree Lifecycle

```bash
# List all worktrees
git worktree list

# Remove a worktree after merging its PR
git worktree remove ../anti-blunder-club--feat-auth

# If the worktree has uncommitted changes (confirm with user first)
git worktree remove --force ../anti-blunder-club--feat-auth

# Delete the remote branch after merge
git push origin --delete feat/auth
```

### DevContainer + Worktrees

If using DevContainer: open each worktree as a **separate VS Code window** using
"Open Folder in Container" on the worktree directory. Each worktree gets its own
container instance but shares the same Postgres volume.

Use different DB names per worktree (set in `.env.local`) to prevent migration
conflicts between parallel features.

---

## Claude Code Specific Guidance

### When to Use Plan Mode

Use `/plan` before starting any task that involves:

- More than 3 files being created or modified
- A new database migration
- Changes to `server/auth.ts` or `server/db.ts`
- Any change to the Prisma schema
- Adding a new npm dependency

Skip plan mode for: single-file fixes, adding a Zod schema field, writing a test
for an already-implemented function.

### How to Work in a Worktree

When Claude Code is operating in a worktree:

1. Read this CLAUDE.md from the worktree root (same file — worktrees share the git
   history including this file).
2. The current branch is the feature branch — never push to `main` from a worktree.
3. The worktree has its own `node_modules` — run `npm install` if packages are missing.
4. Prisma migrations created in a worktree must be reviewed before merging to main.
5. Check `.env.local` exists and has the correct `DATABASE_URL` for this worktree.

### Task Decomposition Order

When building a new feature, always follow this order:

1. Zod schema / types (no dependencies — easiest to test)
2. Prisma schema changes + migration
3. Service layer (pure business logic, mock DB in tests)
4. Server Actions (thin orchestration, test with mocked services)
5. Server Component (data fetching, no client state)
6. Client Component (interactivity, only if needed)
7. Integration test

### What Claude Must Never Do

- Never read or log the value of `ANTHROPIC_API_KEY`, `DATABASE_URL`, or
  `NEXTAUTH_SECRET`.
- Never write `any` type.
- Never create a file in `app/` that imports from `server/` directly.
- Never run `prisma migrate dev` without confirming with the user first.
- Never run `npm install <package>` without checking `package.json` first.
- Never push to `main` directly — always use a PR from a feature branch.

---

## AI Integration Patterns

### Claude API Usage

The Anthropic SDK is used **only** in `server/ai/claude-client.ts`.
No other file touches the SDK directly.

```typescript
// server/ai/claude-client.ts — the ONLY file that reads ANTHROPIC_API_KEY
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateCoaching(prompt: CoachingPrompt): Promise<CoachingResponse> {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: buildBlunderCoachMessages(prompt),
  })
  return parseCoachingResponse(message)
}
```

### Prompt Templates

Prompts are typed functions, not template literals scattered in service files.

```typescript
// server/ai/prompts/blunder-coach.prompt.ts
export function buildBlunderCoachMessages(input: BlunderCoachInput): MessageParam[] {
  return [
    {
      role: 'user',
      content: `You are a chess coach. Explain why the move was a blunder.
Position: ${input.fen}
Move played: ${input.moveAlgebraic}
Best move: ${input.bestMove}
Centipawn loss: ${input.centipawnLoss}

Be concise (3-4 sentences). End with one key concept to remember.`,
    },
  ]
}
```

This makes prompts testable without calling the real API.

---

## Common Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run all unit tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:integration # Integration tests (needs running DB)

# Database
npx prisma studio        # Visual DB editor (browser)
npx prisma migrate dev --name <name>   # New migration (dev only)
npx prisma migrate deploy              # Apply migrations (prod)
npx prisma generate                    # Regenerate Prisma client
npx prisma db seed                     # Run seed script (future)

# Code Quality
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run format           # Prettier write
npm run format:check     # Prettier check (CI)

# Git Worktrees
git worktree list
git worktree add ../anti-blunder-club--<branch> <branch>
git worktree remove ../anti-blunder-club--<branch>
```

---

## Environment Variables

All required variables are documented in `.env.example`.

| Variable            | Required | Notes                                         |
| ------------------- | -------- | --------------------------------------------- |
| `DATABASE_URL`      | yes      | PostgreSQL connection string                  |
| `NEXTAUTH_SECRET`   | yes      | `openssl rand -base64 32`                     |
| `NEXTAUTH_URL`      | yes      | `http://localhost:3000` in dev                |
| `ANTHROPIC_API_KEY` | yes      | Server-only. Never use `NEXT_PUBLIC_` prefix. |

Never add `NEXT_PUBLIC_` prefix to any secret. That prefix exposes values to the
browser bundle.
