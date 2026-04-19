---
description: "Enter plan mode: gather context, propose TDD steps, await user approval before writing code"
---

# /plan — Plan a feature or change

Use when a task involves more than 3 files, new dependencies, or architectural decisions.

## Steps

1. **Rebuild context.**
   - Read `AGENTS.md` and any matching `.github/instructions/*.instructions.md` (by glob).
   - Run `git log --oneline -10` to understand recent work.
   - If working on an existing feature, read the related files end-to-end before proposing changes.

2. **Ask clarifying questions.** Never assume. Surface any ambiguity in requirements, design, or scope.

3. **Draft the plan. Include:**
   - Files to create / modify (exact paths).
   - New dependencies (if any) and justification.
   - **TDD steps**: which test is written first, what it asserts, what the minimum implementation looks like.
   - **Measurability**: what PostHog event(s) will confirm the feature is used. Name them and list params. Update the `AnalyticsEvent` union.
   - SEO impact: does a new page need `<SEOHelmet>` and a sitemap entry?
   - Rollback plan if the change doesn't land cleanly.

4. **Await approval.** Do not write code until the user confirms the plan.

5. **Execute.** Follow `/tdd` for each implementation step.
