# Analysis module — test coverage (helicopter view)

This document describes the test suite that ships with the pure analyzer in
[frontend/src/services/analysis/](../frontend/src/services/analysis/). It is a
map of **what we verify**, **what we intentionally don't**, and **why each
test exists** — so future contributors know where to hang new tests and what
has already been nailed down.

All tests live under
[frontend/src/services/analysis/\_\_tests\_\_/](../frontend/src/services/analysis/__tests__/)
and run as part of the normal Vitest suite (`npm test`).

---

## 1. Module under test

The analyzer adapted from WintrChess is split into layers. The tests are
organized to mirror that split:

```
constants/                 ← enums / numeric constants (not directly tested;
                             exercised through higher layers)
types/                     ← plain interfaces + tiny pure helpers
utils/chess.ts             ← chess.js wrappers (exercised via classify/report)
reporter/
  expectedPoints.ts        ← win-probability + points-loss math
  accuracy.ts              ← move accuracy + per-colour game accuracy
  classification/
    pointLoss.ts           ← bucketed classification by points-loss
  classify.ts              ← top-level per-node classifier
  report.ts                ← full pipeline: walk tree, fill everything in
```

The tests deliberately stop at the analyzer's public surface: `classify`,
`getGameAnalysis`, `getMoveAccuracy`, `getGameAccuracy`, `getExpectedPoints`,
`getExpectedPointsLoss`, `pointLossClassify`. We treat the rest as
implementation detail.

---

## 2. Test-pyramid view

```
                       ┌────────────────────────┐
                       │   report.test.ts (3)   │   ← pipeline / integration
                       └────────────────────────┘
                 ┌──────────────────────────────────┐
                 │       classify.test.ts (5)       │  ← component-level
                 └──────────────────────────────────┘
        ┌────────────────────────────────────────────────┐
        │  pointLoss.test.ts (15) · accuracy.test.ts (5) │  ← unit
        │         expectedPoints.test.ts (10)            │
        └────────────────────────────────────────────────┘
```

- **Unit layer** — direct, dependency-free tests of the math (30 tests).
- **Component layer** — `classify()` against realistic position + synthetic
  engine lines (5 tests).
- **Integration layer** — `getGameAnalysis()` end-to-end on a linear game (3
  tests).

Total: **38 tests** for this module, contributing to the 255-test project
suite.

---

## 3. Shared test helper — `helpers/buildTree.ts`

Because the real analyzer walks a `StateTreeNode` tree with engine-line
hints attached to each node, most component/integration tests need to
construct such a tree. The helper
[buildTree.ts](../frontend/src/services/analysis/__tests__/helpers/buildTree.ts)
does two things:

- `buildEngineLine(fen, san, evaluation)` — produces a one-move
  `EngineLine` with a realistic UCI derived from `chess.js`, stamped as
  Stockfish 17 depth 20 by default.
- `buildLinearTree(startFen, rootBestLine, moves[])` — builds a linear
  chain of nodes where each move is a `{ san, bestLine }` spec (+ optional
  `secondLine` for brilliant/critical tests). Each node has its FEN, played
  move, side-to-move, and synthetic engine lines properly wired.

This keeps tests readable — specs declare _what_ the position looks like,
not how to thread `parent`/`children`/`mainline`/`engineLines` pointers.

---

## 4. Test files

### 4.1 `expectedPoints.test.ts` — 10 tests

Covers the win-probability function and its derived "points loss".

**`getExpectedPoints`** (6 tests):

| Scenario  | What it asserts                              |
| --------- | -------------------------------------------- |
| cp = 0    | Returns exactly 0.5 (dead draw).             |
| cp = +400 | Returns ≈ 0.8021 (logistic with k = 0.0035). |
| cp = −400 | Symmetric to above (≈ 0.1979).               |
| mate = +5 | Returns 1 (winning side is mating).          |
| mate = −3 | Returns 0.                                   |
| mate = 0  | Follows side-to-move convention (White = 1). |

**`getExpectedPointsLoss`** (4 tests):

| Scenario                           | What it asserts                                 |
| ---------------------------------- | ----------------------------------------------- |
| equal evals                        | Loss is 0 (no change).                          |
| eval improved for the moving side  | Clamped to 0 — we don't reward good moves here. |
| White worsens 0 → −400             | Positive loss ≈ 0.3021.                         |
| Black worsens 0 → +400 (White POV) | Symmetric positive loss.                        |

**Why this matters** — every downstream classification (accuracy,
pointLoss buckets, best/excellent/mistake labels) feeds on these two
functions. If the curve is off, every other report is off.

---

### 4.2 `accuracy.test.ts` — 5 tests

**`getMoveAccuracy`** (3 tests):

| Scenario      | What it asserts                                    |
| ------------- | -------------------------------------------------- |
| No loss       | Accuracy ≈ 100 (tight close-to 99.99).             |
| Moderate loss | Accuracy sits in a sane mid-range (50 < acc < 85). |
| Monotone      | Larger loss ⇒ strictly smaller accuracy.           |

**`getGameAccuracy`** (2 tests):

| Scenario                        | What it asserts                                   |
| ------------------------------- | ------------------------------------------------- |
| 4-node chain, 2 white / 2 black | Per-colour averages computed independently.       |
| Missing accuracy on a node      | That node is skipped (colour with no data → NaN). |

**Why this matters** — "game accuracy" is one of the two headline numbers
(alongside per-move classification) we plan to surface in the UI. It must
be a faithful mean and must handle partial data (e.g. opening theory with
no accuracy) without polluting the result.

---

### 4.3 `pointLoss.test.ts` — 15 tests

Exhaustive bucket coverage for `pointLossClassify`, which is the
fallback classifier when the player does _not_ play the engine's top
move. The ruleset is piecewise across four eval-shape transitions:

| Transition            | # tests | Buckets exercised                                                                   |
| --------------------- | ------- | ----------------------------------------------------------------------------------- |
| centipawn → centipawn | 3       | BEST (tiny loss), BLUNDER (big loss), symmetric Black blunder.                      |
| mate → centipawn      | 5       | EXCELLENT ≥ 800, OKAY 400-800, INACCURACY 200-400, MISTAKE 0-200, BLUNDER < 0.      |
| centipawn → mate      | 4       | BEST (delivering mate), BLUNDER / MISTAKE / INACCURACY (allowing mate, near → far). |
| mate → mate           | 3       | BEST (keeping forced mate), BLUNDER / MISTAKE when winning mate flips to losing.    |

**Why this matters** — these buckets determine the labels users will
actually see ("Blunder", "Mistake", "Inaccuracy"...). Each edge is a
potential off-by-one that would noticeably mislabel a move.

---

### 4.4 `classify.test.ts` — 5 tests

Tests the per-node classifier in realistic miniature scenarios:

| Scenario                                  | What it asserts                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Node has no parent                        | `classify` throws — can't classify the root.                                                          |
| Played move equals engine top move        | Returns `BEST`.                                                                                       |
| Suboptimal move                           | Falls back to a point-loss bucket (MISTAKE / BLUNDER / INACCURACY).                                   |
| Only one legal move in the prior position | Returns `FORCED`. Uses a verified 1-legal-move FEN and computes the reply dynamically via `chess.js`. |
| cp → mate-against (Fool's-mate setup)     | Returns `BLUNDER`.                                                                                    |

Note the suboptimal-move test uses a `.toContain(...)` soft assertion —
we want to prove the fallback _happens_, without pinning the exact
bucket, because the WintrChess thresholds are tuned empirically and may
shift by one bucket without being wrong.

**Why this matters** — `classify()` is the single function the UI will
call per move. Every branch (BEST / FORCED / fallback / edge) must be
exercised.

---

### 4.5 `report.test.ts` — 3 tests

End-to-end via `getGameAnalysis` on a linear game:

| Scenario                           | What it asserts                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2-move mainline, all moves optimal | Root untouched (no accuracy/classification); every non-root node gets `accuracy: number` and a defined `classification`. |
| Single top-move played             | That node is classified as `BEST`.                                                                                       |
| Node with stripped engine lines    | Pipeline does not throw; that node's classification is left `undefined`. Graceful degradation, not a crash.              |

**Why this matters** — this is the contract the frontend will consume.
The analyzer must (a) mutate the tree in place with its results, (b)
cope with sparse engine data without blowing up the whole game.

---

## 5. Coverage gaps — intentional and open

### Intentionally uncovered (out of scope for this phase)

- **`includeBrilliant` / `includeCritical` paths** — not exercised. Phase 2
  MVP only uses the pointLoss fallback + BEST + FORCED. The advanced
  classifiers (`brilliant.ts`, `critical.ts`, `dangerLevels.ts`,
  `pieceSafety.ts`, `pieceTrapped.ts`, `attackers.ts`, `defenders.ts`) are
  wired but not called because `classify()` is invoked with
  `includeBrilliant: false` / `includeCritical: false`.
- **`includeTheory` / `getOpeningName`** — we ship a stub that always
  returns `undefined`. A real opening book is a later phase.
- **`constants/utils.ts` (`pieceNames`, `pieceValues`, `lichessCastlingMoves`)**
  — trivial data tables exercised through higher layers.
- **Enum-like objects** — `Classification`, `PieceColour`, `EngineVersion`
  are compile-time constants; any typo would fail type-check before
  reaching a test.
- **chess.js integration itself** — we trust the library's legal-move and
  FEN handling.

### Open / future work

- Add tests for `considerBrilliantClassification` and
  `considerCriticalClassification` before the UI exposes those labels.
- Add a golden-file test against one or two recorded games once we have a
  stable output shape — useful as a regression net.
- Add tests for `extractNode` once we start consuming its output directly
  in the UI (currently exercised only transitively via `classify`).

---

## 6. Conventions for new tests

1. **Arrange with `buildLinearTree`** for anything that needs a tree.
   Don't hand-roll `StateTreeNode` objects in new tests — extend the
   helper instead.
2. **Prefer synthetic engine lines** over invoking a real engine. The
   analyzer is pure, and so should its tests be.
3. **Pin values that are specified by math** (e.g. cp = 400 → 0.8021)
   and use loose ranges for values the WintrChess authors tuned
   empirically (e.g. fallback bucket on a random suboptimal move).
4. **Cover the edges of every bucket** in any new piecewise classifier
   — that is where misclassification lives.
5. **Don't test private helpers directly** — route assertions through
   `classify` / `getGameAnalysis` so refactors don't break tests.
