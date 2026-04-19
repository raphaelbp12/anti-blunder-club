---
applyTo: "frontend/**/*.{ts,tsx}"
description: "Testing conventions: TDD workflow, React Testing Library, Zustand store tests"
---

# Testing Instructions

## TDD Discipline

1. Write a failing test first (red).
2. Implement the minimum code to pass (green).
3. Refactor with tests green.

Never write implementation code before its test exists.

## File Layout

- Tests live in `__tests__/` directories adjacent to source files.
  - `src/components/Foo.tsx` → `src/components/__tests__/Foo.test.tsx`
  - `src/utils/bar.ts` → `src/utils/__tests__/bar.test.ts`
- One test file per source file.

## React Testing Library

- Query by **role**, **label**, or **text** — not by class name.
- Use test IDs only when no semantic selector works.
- Prefer `userEvent` over `fireEvent` for interactions.

## Zustand Stores

- Test stores outside React using `useStore.getState()` and `useStore.setState()`.
- Reset store state in `beforeEach` to keep tests isolated.

## Running Tests

From `frontend/`:

- `npm run test` — single run (use before commits)
- `npm run test:watch` — watch mode during development

Do not mark a task complete until the new test and the full suite pass.
