---
description: "Safely update AGENTS.md, CLAUDE.md, or .github/ customization files without creating duplication"
---

# /update-agent-files — Maintain agent customization

Use when adding or changing content in `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/*`, or `.github/prompts/*`.

Read [.github/instructions/agent-customization.instructions.md](../instructions/agent-customization.instructions.md) for the full rule set before editing.

## Procedure

1. **Classify the change.** Is it:
   - (a) Tool-neutral project knowledge → `AGENTS.md`.
   - (b) Scoped to a domain (testing / analytics / seo / …) → `.github/instructions/<domain>.instructions.md`.
   - (c) Claude-only ritual (plan mode, chat lifecycle) → `CLAUDE.md`.
   - (d) Copilot-only hint → `.github/copilot-instructions.md`.
   - (e) Reusable workflow → `.github/prompts/<name>.prompt.md`.

2. **Find the single owner.** Search for existing mentions before writing new content:

   ```bash
   grep -rn "<keyword>" AGENTS.md CLAUDE.md .github/
   ```

   If it's already documented, edit in place. Do not create a second copy.

3. **Make the edit in exactly one file.** Other files may link to it; they must not restate it.

4. **If you created a new `.instructions.md` or `.prompt.md` file**, update `CLAUDE.md` `@`-imports so Claude can discover it. Copilot auto-discovers by location.

5. **Validate frontmatter.**
   - YAML between `---` markers.
   - Spaces only (no tabs).
   - Quote values containing colons: `description: "Use when: foo"`.
   - `applyTo` globs are as narrow as possible. Avoid `applyTo: "**"`.

6. **Run checks before committing:**

   ```bash
   cd frontend && npm run format:check
   ```

7. **Commit** with a `chore:` or `docs:` prefix describing what was updated.

## Verification

After editing, confirm both clients will pick up the change:

- **Copilot**: files under `.github/instructions/` with matching `applyTo` will auto-load when editing matching files.
- **Claude Code**: `CLAUDE.md` must `@`-import every scoped instruction file and prompt file you rely on.
