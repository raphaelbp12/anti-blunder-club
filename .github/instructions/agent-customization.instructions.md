---
applyTo: "{AGENTS.md,CLAUDE.md,.github/copilot-instructions.md,.github/instructions/**,.github/prompts/**}"
description: "Rules for maintaining agent customization files without creating duplication or drift"
---

# Agent Customization Maintenance

These files configure AI assistants (Claude Code, GitHub Copilot). They must stay consistent and free of duplication across clients.

## File Ownership

| File | Owns | Audience |
| --- | --- | --- |
| `AGENTS.md` | Tool-neutral project knowledge (overview, architecture, critical rules, commands, git workflow) | Both clients |
| `CLAUDE.md` | `@`-imports + Claude-only behaviors (plan mode rituals, chat lifecycle, Claude-specific examples) | Claude Code only |
| `.github/copilot-instructions.md` | Short pointer to `AGENTS.md` + Copilot-only notes | Copilot only |
| `.github/instructions/*.instructions.md` | Scoped rules with `applyTo` globs (testing, analytics, seo, ...) | Copilot auto-loads by glob; Claude loads via `@`-import in `CLAUDE.md` |
| `.github/prompts/*.prompt.md` | Reusable workflows invocable as `/name` | Both (Copilot: slash command; Claude: reference the path) |

## Rules

1. **Single source of truth.** A fact lives in exactly one file. If it applies broadly, it goes in `AGENTS.md`. If it's scoped to a domain (testing, analytics, seo), it goes in the matching `.github/instructions/*.instructions.md`. Never restate it elsewhere.
2. **Summaries may link, not duplicate.** `AGENTS.md` may contain a one-line summary plus a link to the detailed scoped file, but must not restate the detail.
3. **`applyTo` globs must be as narrow as reasonable.** Avoid `applyTo: "**"` — it burns context on every interaction. Prefer specific paths (`frontend/src/pages/**`, `**/*.test.{ts,tsx}`).
4. **Every new scoped instruction file must be `@`-imported in `CLAUDE.md`.** Claude does not auto-discover `.github/instructions/`; without the import, Claude will not see it.
5. **Every new prompt file must be `@`-imported in `CLAUDE.md`.** Copilot auto-discovers `.github/prompts/` as slash commands; Claude needs the explicit import to know they exist.
6. **Critical rules live in `AGENTS.md` only.** Do not duplicate the "Critical Rules" list in `CLAUDE.md` or `copilot-instructions.md`. Reference by link if needed.
7. **YAML frontmatter must be valid.** Between `---` markers, spaces not tabs, quote values containing colons. A broken frontmatter causes silent failures.
8. **Descriptions are the discovery surface.** The `description:` frontmatter field is how Copilot decides whether to surface a file. Include trigger keywords the user would say.
9. **No client-specific content in `AGENTS.md`.** Anything mentioning "Claude" or "Copilot" mechanics belongs in the corresponding client file.
10. **When in doubt, follow `/update-agent-files`.** The prompt encodes the full procedure.

## Anti-patterns

- Copy-pasting the same paragraph into both `AGENTS.md` and `CLAUDE.md`.
- Adding a `.github/instructions/*.instructions.md` without updating `CLAUDE.md` `@`-imports.
- Using `applyTo: "**"` when a narrower glob would do.
- Putting Claude-specific rituals (plan mode, chat lifecycle) in `AGENTS.md`.
- Documenting a new event, page, or convention in one client's file only.
