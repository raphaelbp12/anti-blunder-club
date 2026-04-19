---
description: "Test-Driven Development cycle: write a failing test, implement minimum, refactor"
---

# /tdd — Red / Green / Refactor

## Cycle

1. **Red.** Write one failing test that describes the next smallest increment of behavior.
   - Place it in the correct `__tests__/` folder adjacent to the source.
   - Query by role / label / text (React Testing Library).
   - Run `npm run test` — confirm the new test fails for the expected reason.

2. **Green.** Write the minimum production code needed to make the test pass.
   - No extra features. No speculative abstractions.
   - Run `npm run test` — confirm the new test passes and nothing else broke.

3. **Refactor.** Clean up with tests green.
   - Extract helpers, rename for clarity, remove duplication.
   - Re-run `npm run test` after each refactor.

## Rules

- Never write production code before its test exists.
- One failing test at a time.
- If the test is hard to write, the design is likely wrong — step back and reconsider.
- Never mark a task done until `npm run test` passes.
