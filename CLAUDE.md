# CLAUDE.md

Entry point for Claude Code. Project-wide conventions live in `AGENTS.md`; scoped rules and workflows live under `.github/`. All are imported below so Claude has the full picture.

## Imports

@AGENTS.md

@.github/instructions/testing.instructions.md
@.github/instructions/analytics.instructions.md
@.github/instructions/seo.instructions.md
@.github/instructions/agent-customization.instructions.md

@.github/prompts/plan.prompt.md
@.github/prompts/tdd.prompt.md
@.github/prompts/ship.prompt.md
@.github/prompts/update-agent-files.prompt.md

---

## Claude Code specifics

These behaviors apply only to Claude Code (Copilot has no equivalent concepts).

### Plan Mode

Use plan mode before starting any task that involves:

- More than 3 files being created or modified
- Adding a new dependency or framework
- Architectural decisions

Follow `.github/prompts/plan.prompt.md` for the procedure.

### Chat Lifecycle (One Chat Per Plan)

Each feature gets a fresh chat. To make this work:

1. **Start of chat:** Read memory files and `AGENTS.md` to rebuild context. Run `git log --oneline -10` to understand recent work.
2. **Planning:** Enter plan mode. Write TDD steps. Get approval.
3. **Implementation:** Follow the plan. TDD red-green cycle. Mark tasks as you go.
4. **End of chat:** Run all checks (`test`, `lint`, `format:check`, `build`). Commit and push. Then **always** ask the user: "Is there anything from this session worth saving to memory?" — do not skip this step.

### Claude-specific never-dos

These complement the general "Critical Rules" in `AGENTS.md`:

- Never read or log the value of `ANTHROPIC_API_KEY` (concrete instance of the general "never read secret env vars" rule in `AGENTS.md`).
