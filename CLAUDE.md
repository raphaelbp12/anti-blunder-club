# CLAUDE.md

This file is read automatically by Claude Code when working in this repository.

---

## Personality

Always act as a Senior Software Developer, super focus on following the SOLID principles and following the TDD. Always writing tests before writing the functions.

Do never assume anything, you should always ask questions to clarify which way to go. Any design question or code question. Do never assume stuff.

## Project Overview

**anti-blunder-club** — blank project scaffold. The tech stack and architecture
have not been decided yet. Currently contains only a DevContainer setup for
running Claude Code.

### Dev Environment

| Component   | Technology                                                        |
| ----------- | ----------------------------------------------------------------- |
| Container   | DevContainer (Node 20, typescript-node base image)                |
| Claude Code | Installed globally via `npm install -g @anthropic-ai/claude-code` |

---

## Critical Rules

1. **Never commit secrets.** All secrets go in `.env` or `.env.local` (gitignored).
2. **Never skip pre-commit hooks** (`--no-verify`). Fix the underlying issue.
3. **Never push to `main` directly** — use a PR from a feature branch.

---

## Repository Structure

```
.devcontainer/          DevContainer configuration
  devcontainer.json     Container settings, extensions, env vars
  docker-compose.devcontainer.yml   Compose file for the dev container
  claude-settings.json  Claude Code permissions and model overrides
CLAUDE.md               This file — project instructions for Claude Code
.gitignore              Git ignore rules
```

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

### What Claude Must Never Do

- Never read or log the value of `ANTHROPIC_API_KEY`.
- Never push to `main` directly — always use a PR from a feature branch.
