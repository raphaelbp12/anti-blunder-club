# CLAUDE.md

This file is read automatically by Claude Code when working in this repository.

---

## Personality

Always act as a Senior Software Developer, super focus on following the SOLID principles and following the TDD. Always writing tests before writing the functions.

Do never assume anything, you should always ask questions to clarify which way to go. Any design question or code question. Do never assume stuff.

## Project Overview

**anti-blunder-club** — a frontend-only React web application.

### Dev Environment

| Component   | Technology                                                        |
| ----------- | ----------------------------------------------------------------- |
| Container   | DevContainer (Node 20, typescript-node base image)                |
| Claude Code | Installed globally via `npm install -g @anthropic-ai/claude-code` |

### Tech Stack

| Layer       | Technology                     |
| ----------- | ------------------------------ |
| Framework   | React 19 + TypeScript          |
| Build Tool  | Vite 8                         |
| Styling     | Tailwind CSS v4                |
| Routing     | React Router DOM v7            |
| State Mgmt  | Zustand v5                     |
| Testing     | Vitest + React Testing Library |
| Linting     | ESLint 9 (flat config)         |
| Formatting  | Prettier 3                     |
| Package Mgr | npm                            |

---

## Critical Rules

1. **Never commit secrets.** All secrets go in `.env` or `.env.local` (gitignored).
2. **Never skip pre-commit hooks** (`--no-verify`). Fix the underlying issue.
3. **Never push to `main` directly** — use a PR from a feature branch.

---

## Application Architecture

**What the app does:** Lets users search for a Chess.com player by username and browse their recent matches with accuracy data.

### Route Structure

```
/                                → HomePage (search input only)
/player/:username                → PlayerPage (game list, cached in Zustand)
/player/:username/match/:gameId  → MatchPage (match detail view)
*                                → NotFoundPage
```

### Data Flow

```
Chess.com API → chessComApi.ts (service) → usePlayerGamesStore (Zustand cache) → pages/components
```

- `chessComApi.ts` — fetch functions, type definitions, raw-to-domain mapping
- `usePlayerGamesStore` — caches games by username (`Record<string, ChessGame[]>`), prevents re-fetching
- Pages read from the store; MatchPage also accepts router state for zero-latency navigation

### Key Conventions

- Pages own data fetching (via store hooks or direct API calls)
- Components are presentational — receive data via props
- Router state is used for optimistic navigation (pass data through `<Link state={}>`)
- All API types live in `chessComApi.ts`, not scattered across files

---

## Repository Structure

```
.devcontainer/          DevContainer configuration
  devcontainer.json     Container settings, extensions, env vars
  docker-compose.devcontainer.yml   Compose file for the dev container
  claude-settings.json  Claude Code permissions and model overrides
frontend/               React frontend application
  src/
    components/         Reusable UI components (MatchList, PlayerSearch)
    pages/              Route-level page components (HomePage, PlayerPage, MatchPage, NotFoundPage)
    routes/             Routing configuration (AppRouter)
    services/           API clients and types (chessComApi)
    stores/             Zustand state stores (usePlayerGamesStore)
    test/               Test setup and utilities
  public/               Static assets (404.html for SPA routing)
CLAUDE.md               This file — project instructions for Claude Code
.gitignore              Git ignore rules
```

---

## Frontend Commands

All commands run from the `frontend/` directory:

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the Vite dev server           |
| `npm run build`        | Type-check and build for production |
| `npm run test`         | Run tests once                      |
| `npm run test:watch`   | Run tests in watch mode             |
| `npm run lint`         | Run ESLint                          |
| `npm run lint:fix`     | Auto-fix ESLint issues              |
| `npm run format`       | Format code with Prettier           |
| `npm run format:check` | Check formatting without writing    |

---

## Testing Conventions

- Write tests before implementation (TDD).
- Tests live in `__tests__/` directories adjacent to source files.
- Use React Testing Library. Query by role, label, or text — not by class name or test ID unless necessary.
- Zustand stores can be tested outside React by using `getState()` and `setState()` directly.

---

## Git Workflow

### Branch Strategy

```
main      → protected, no direct pushes
feat/*    → feature branches
fix/*     → bug fixes
chore/*   → tooling, deps, config
```

Use pull requests. Squash merge.

---

## Claude Code Guidance

### When to Use Plan Mode

Use plan mode before starting any task that involves:

- More than 3 files being created or modified
- Adding a new dependency or framework
- Architectural decisions

### Chat Lifecycle (One Chat Per Plan)

Each feature gets a fresh chat. To make this work:

1. **Start of chat:** Read memory files and CLAUDE.md to rebuild context. Run `git log --oneline -10` to understand recent work.
2. **Planning:** Enter plan mode. Write TDD steps. Get approval.
3. **Implementation:** Follow the plan. TDD red-green cycle. Mark tasks as you go.
4. **End of chat:** Run all checks (`test`, `lint`, `format:check`, `build`). Commit and push. Then **always** ask the user: "Is there anything from this session worth saving to memory?" — do not skip this step.

### What Claude Must Never Do

- Never read or log the value of `ANTHROPIC_API_KEY`.
- Never push to `main` directly — always use a PR from a feature branch.
