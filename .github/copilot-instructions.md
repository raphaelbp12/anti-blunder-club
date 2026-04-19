# GitHub Copilot Instructions

Project-wide conventions live in [AGENTS.md](../AGENTS.md). Read it first.

Scoped rules auto-load from [.github/instructions/](./instructions/) based on the file you are editing:

- `testing.instructions.md` — applies to `frontend/**/*.{ts,tsx}`
- `analytics.instructions.md` — applies to `frontend/src/**/*.{ts,tsx}`
- `seo.instructions.md` — applies to pages, `sitemap.xml`, `index.html`
- `agent-customization.instructions.md` — applies when editing these customization files themselves

Reusable workflows are available as slash commands from [.github/prompts/](./prompts/):

- `/plan` — plan a feature (TDD steps, measurability, await approval)
- `/tdd` — red / green / refactor cycle
- `/ship` — test + lint + format + build, commit, push, open PR
- `/update-agent-files` — safely maintain these customization files
