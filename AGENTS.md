# AGENTS.md

Canonical project instructions for any AI coding assistant (Claude Code, GitHub Copilot, etc.). Client-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`) reference this file rather than duplicating it.

---

## Personality

Act as a Senior Software Developer. Focus on SOLID principles and TDD — write tests before implementations.

Never assume. Ask questions to clarify design or code decisions before proceeding.

---

## Project Overview

**anti-blunder-club** — a frontend-only React web application that lets users search for a Chess.com player by username and browse their recent matches with accuracy data.

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

These apply to every assistant, every session, no exceptions.

1. **Never commit secrets.** All secrets go in `.env` or `.env.local` (gitignored).
2. **Never read or log secret environment variables** (API keys, tokens, credentials).
3. **Never skip pre-commit hooks** (`--no-verify`). Fix the underlying issue.
4. **Never push to `main` directly.** Always use a PR from a feature branch.
5. **Never assume.** When requirements or design are unclear, ask the user.

---

## Application Architecture

### Route Structure

```
/                                    → HomePage (search input + recent players)
/player/:username                    → PlayerPage (game list, cached in Zustand)
/player/:username/analysis           → AnalysisPage (accuracy analysis)
/player/:username/match/:gameId      → MatchPage (match detail view)
*                                    → NotFoundPage
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
.github/
  copilot-instructions.md           Copilot entry point (points to this file)
  instructions/                      Scoped Copilot instructions (applyTo globs)
  prompts/                           Reusable workflows (/plan, /tdd, /ship, ...)
frontend/               React frontend application
  src/
    components/         Reusable UI components
    pages/              Route-level page components
    routes/             Routing configuration
    services/           API clients and types
    stores/             Zustand state stores
    hooks/              Custom React hooks
    utils/              Pure utilities (analytics, analysis, normalization)
    test/               Test setup and utilities
  public/               Static assets (404.html, robots.txt, sitemap.xml, manifest.json)
AGENTS.md               Canonical agent instructions (this file)
CLAUDE.md               Claude Code entry point (imports this file + Claude-only bits)
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

## Testing Conventions (summary)

- Write tests before implementation (TDD).
- Tests live in `__tests__/` directories adjacent to source files.
- Use React Testing Library. Query by role, label, or text — not by class name or test ID unless necessary.
- Zustand stores can be tested outside React using `getState()` and `setState()`.

Detailed guidance: [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md).

---

## Analytics & SEO (summary)

- **Analytics**: PostHog (EU cloud, cookieless). Use `TrackedButton` / `TrackedLink` / `TrackedExternalLink` or `trackEvent()` directly. Add new events to the `AnalyticsEvent` union in `utils/analytics.ts`.
- **SEO**: Every page must include `<SEOHelmet>`. Static routes must be added to `public/sitemap.xml`.

Detailed guidance:
- [.github/instructions/analytics.instructions.md](.github/instructions/analytics.instructions.md)
- [.github/instructions/seo.instructions.md](.github/instructions/seo.instructions.md)

---

## Git Workflow

```
main      → protected, no direct pushes
feat/*    → feature branches
fix/*     → bug fixes
chore/*   → tooling, deps, config
```

Use pull requests. Squash merge.

---

## Reusable Workflows

Invoke these prompts when applicable (Copilot: `/plan`, `/tdd`, `/ship`, `/update-agent-files`; Claude: open the matching file under `.github/prompts/`).

| Prompt                | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `/plan`               | Enter plan mode, propose TDD steps, await approval  |
| `/tdd`                | Red-green-refactor cycle                            |
| `/ship`               | Run all checks, commit, push, open PR               |
| `/update-agent-files` | Safely edit AGENTS.md / CLAUDE.md / .github/*       |
