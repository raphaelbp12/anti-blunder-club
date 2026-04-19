---
description: "End-of-session checks: test, lint, format, build; then commit and push a feature branch"
---

# /ship — Ship the work

Run from `frontend/` unless noted.

## Checks (must all pass)

```bash
npm run test
npm run lint
npm run format:check
npm run build
```

Fix any failure before continuing. Never skip.

## Commit

- Stage only the relevant files.
- Write a clear commit message following the branch's convention (`feat:`, `fix:`, `chore:` prefixes preferred).
- **Never use `--no-verify`.** If a pre-commit hook fails, fix the root cause.

## Branch + push

- Confirm the branch is `feat/*`, `fix/*`, or `chore/*` — **never `main`**.
- Push the branch to origin.
- Open (or update) a pull request. Squash merge.

## Wrap up

After pushing, ask the user:

> "Is there anything from this session worth saving to memory?"

Do not skip this question.
