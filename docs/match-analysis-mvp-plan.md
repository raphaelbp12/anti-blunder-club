# Plan — Match Analysis MVP (Reusing WintrChess)

> **Status:** planning document. Use as a prompt/spec for implementation chats.
> **Source of truth for algorithm details:** [docs/wintrchess-analysis-findings.md](./wintrchess-analysis-findings.md).
> **Source code being reused:** [temp/wintrchess/](../temp/wintrchess) (cloned locally, gitignored).

---

## 0. Ground rules

These apply to every phase.

- **License:** we accept GPL-3.0. The project will be distributed under **GPL-3.0-or-later**. Before shipping the first analysis code, add a top-level `LICENSE` file with the GPL-3.0 text and a short `NOTICE`/README credit to WintrChess. Keep WintrChess's copyright headers intact on any file we copy.
- **Reuse, don't rewrite.** Copy WintrChess code where it's pure and already well-factored. Only adapt what doesn't fit our stack (e.g. module resolution, `zod` schemas we don't need, React hooks that belong to their UI).
- **SOLID.** Keep the seams we already identified:
  - `UciEngine` — single responsibility, speaks UCI to one worker.
  - `EngineScheduler` — owns the worker pool + FIFO queue (MVP `poolSize = 1`).
  - `PositionProvider` — interface (DIP seam) so we can swap local/cloud/hybrid later.
  - `analyzeGame(pgn, provider, options)` — pure orchestrator, no React, no store.
  - `useAnalysisStore` — in-memory cache + status, thin wrapper around `analyzeGame`.
  - `MatchPage` — UI only, dumb.
- **TDD.** Red → green → refactor for every pure module. Use fakes for `PositionProvider` so orchestrator tests don't need a real engine.
- **Parallelization is documented, not built.** `analyzeGame` takes a `PositionProvider`; later we share one `EngineScheduler` across multiple `analyzeGame` calls. MVP runs one game, `poolSize = 1`.
- **No visuals yet.** MVP output: two numbers (White/Black accuracy) + details toggle showing per-move JSON.
- **Engine settings (MVP):** Stockfish 18 Lite single-threaded, **depth 16**, **MultiPV 1**. MultiPV 2 is required for brilliant/critical — deferred.
- **Commit policy:** one PR per phase, each one shippable on its own via `/ship`.

---

## Phase 0 — About page (non-analysis groundwork)

**Goal:** ship a public About page and a header link to it. This phase is independent of the analysis work but is a prerequisite for users to understand the project, find the source, and join the community.

### Steps

1. **Route + page scaffold**
   - New route `/about` in `routes/AppRouter.tsx` → `pages/AboutPage.tsx`.
   - Add `/about` to `public/sitemap.xml`.
   - `AboutPage` includes `<SEOHelmet>` with title/description aligned with the app's SEO conventions.

2. **Navbar link**
   - Add an "About" link to `components/Navbar.tsx`, wrapped in `TrackedLink` with a new analytics event `about_nav_clicked`.

3. **Page content** (order matters — Discord goes first, highlighted)

   **a. Discord call-out (top, visually prominent)**
   - Heading + short pitch ("Join the community").
   - Prominent button/link: `https://discord.gg/qfrXu8WQhu`.
   - Use `TrackedExternalLink`; analytics event `about_discord_clicked`.

   **b. What is Anti-Blunder Club?**
   - Short description: a free, client-side web app that helps chess players learn from their own games by browsing their Chess.com matches and (soon) analysing them with Stockfish.

   **c. Key points** (rendered as a clear bullet list)
   - The app does **not** store any user data. Everything runs client-side; searches and analyses happen in your browser.
   - **Free to use.** No accounts, no paywall.
   - **Goal:** help players learn chess by turning their own games into study material.
   - **Feedback is very welcome** — link to the Discord (same URL) and to the GitHub issues page (`https://github.com/raphaelbp12/anti-blunder-club/issues`). Event: `about_feedback_link_clicked` with a `{ destination: "discord" | "github_issues" }` prop.

   **d. Credits & source**
   - **License:** GPL-3.0-or-later. Link to the `LICENSE` file on GitHub.
   - **Source code:** `https://github.com/raphaelbp12/anti-blunder-club`. Event: `about_source_clicked`.
   - **Heavy inspiration:** [WintrChess](https://github.com/WintrCat/wintrchess) — analysis algorithm, Stockfish integration patterns. Event: `about_wintrchess_clicked`.
   - **Engine:** Stockfish (link to its project page and license).

4. **Analytics — add to the `AnalyticsEvent` union in `utils/analytics.ts`:**
   - `about_nav_clicked`
   - `about_discord_clicked`
   - `about_feedback_link_clicked` (`{ destination: "discord" | "github_issues" }`)
   - `about_source_clicked`
   - `about_wintrchess_clicked`

5. **Tests (TDD):**
   - `AboutPage.test.tsx` — renders Discord link first, renders all key points, renders source + WintrChess links with correct URLs, tracks events on click.
   - `Navbar.test.tsx` — update to assert the About link is rendered and fires `about_nav_clicked`.
   - `AppRouter.test.tsx` — `/about` renders `AboutPage`.

6. **Copy rules**
   - One concise paragraph per section. No marketing fluff.
   - No implementation details that might drift (don't hard-code engine names, depths, etc. on this page).
   - All external links open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). `TrackedExternalLink` already handles this — use it for every external link on the page.

**Exit:** `/about` is reachable from the navbar on every page, shows Discord first, lists the key points, and links to the license, source, and WintrChess. All `/ship` checks green.

---

## Phase 1 — Licensing & housekeeping

**Goal:** make the repo GPL-compliant before any GPL code lands.

### Steps
1. Add top-level `LICENSE` file with GPL-3.0 full text.
2. Update root `README.md` with a short "License" section: project is GPL-3.0-or-later; credit WintrChess (link to repo) and Stockfish.
3. Add SPDX header template to use on copied files:
   ```
   // SPDX-License-Identifier: GPL-3.0-or-later
   // Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
   ```
4. `frontend/package.json` → set `"license": "GPL-3.0-or-later"`.
5. Update the About page license link added in Phase 0 if the final license file name/path differs from what was assumed.

**Exit:** LICENSE exists, README credits sources, no code changes yet.

---

## Phase 2 — Dependencies & pure core (copy + adapt)

**Goal:** have the full classification + accuracy pipeline working as pure TypeScript, with tests, zero engine, zero React.

### Steps

1. **Add dependencies** to `frontend/package.json`:
   - `chess.js` (MIT) — PGN parsing, move legality, SAN/UCI, check/mate.
   - `lodash-es` (MIT) — `meanBy`, `minBy`, `clone` (only what WintrChess already uses).
   - Verify `zod` is not needed here (WintrChess uses it only on the server route — we skip that).

2. **Copy the pure analyzer tree** from WintrChess into `frontend/src/services/analysis/`. Preserve structure and file headers; retarget imports to relative paths; strip server-only bits.

   From `temp/wintrchess/shared/src/lib/reporter/` → `frontend/src/services/analysis/reporter/`:
   - `accuracy.ts`
   - `expectedPoints.ts`
   - `classify.ts`
   - `report.ts` (keep `getGameAnalysis`; drop `estimatedRatings` — not part of MVP)
   - `classification/pointLoss.ts`
   - `classification/brilliant.ts` *(copied but unused in MVP; keep to minimize drift)*
   - `classification/critical.ts` *(copied but unused in MVP)*
   - `utils/extractNode.ts`
   - `utils/criticalMove.ts` *(unused in MVP)*
   - `utils/opening.ts` *(see step 4)*
   - `utils/pieceSafety.ts`, `utils/attackers.ts`, `utils/defenders.ts`, `utils/dangerLevels.ts`, `utils/pieceTrapped.ts` *(unused in MVP; copy anyway — ~200 LOC total — so we don't have to come back)*
   - `types/ExtractedNode.ts`, `types/RawMove.ts`, `types/AnalysisOptions.ts`

   From `temp/wintrchess/shared/src/types/game/position/` → `frontend/src/services/analysis/types/`:
   - `StateTreeNode.ts` (keep runtime helpers: `getNodeChain`, `serializeNode`, `deserializeNode`). **Drop the `zod` schema** (`stateTreeNodeSchema`) — server-only.
   - `EngineLine.ts`
   - `Evaluation.ts`
   - `Move.ts`

   From `temp/wintrchess/shared/src/constants/` → `frontend/src/services/analysis/constants/`:
   - `Classification.ts`
   - `PieceColour.ts`
   - `EngineVersion.ts`
   - `utils.ts` (pick out `pieceValues`, `STARTING_FEN`, `lichessCastlingMoves`)

   From `temp/wintrchess/shared/src/lib/utils/chess.ts` → `frontend/src/services/analysis/utils/chess.ts` (`getSubjectiveEvaluation`, `getCaptureSquare`, etc.).

3. **Fix imports.** WintrChess uses TS path aliases (`shared/...`, `@/...`). Either:
   - Add matching aliases to `frontend/tsconfig.app.json` and `vite.config.ts` (`@analysis/*` → `src/services/analysis/*`), OR
   - Do a one-pass find-and-replace to relative paths.

   Pick one and apply consistently. Recommendation: **relative paths** — simpler, no config drift.

4. **Openings book decision.** `getOpeningName` depends on `resources/openings.json` (~1–2 MB). For MVP:
   - **Option A:** copy the JSON, lazy-load it with dynamic `import()` only when THEORY classification is requested.
   - **Option B:** stub `getOpeningName` to always return `undefined`; MVP disables `includeTheory`.
   - **Recommendation: B.** One less asset, same outcome for MVP. Revisit when we implement the theory feature.

5. **Tests.** Copy any existing WintrChess tests for the pure modules if they exist; otherwise add minimal tests that pin down behaviour per our conventions:
   - `expectedPoints.test.ts` — cp=0 → 0.5; cp=+400 → ~0.80; mate cases; loss clamped at 0.
   - `accuracy.test.ts` — known (loss → accuracy) table; `gameAccuracy` averages per colour.
   - `pointLoss.test.ts` — every bucket boundary (cp→cp, cp→mate, mate→cp, mate→mate).
   - `classify.test.ts` — forced, checkmate short-circuit, top-move-played = best, point-loss fallback. With MVP options `{ includeTheory: false, includeCritical: false, includeBrilliant: false }`.
   - `report.test.ts` — given a small hand-crafted `StateTreeNode` with synthetic `EngineLine`s, `getGameAnalysis` fills `accuracy` and `classification` on every node.

**Exit:** `npm run test` green; pure analyzer callable from anywhere; no engine or React involved.

---

## Phase 3 — Engine (copy `engine.ts`, wrap in a scheduler)

**Goal:** one FEN + depth + MultiPV → `EngineLine[]` from a real Stockfish Worker in the browser.

### Steps

1. **Ship Stockfish binaries** to `frontend/public/engines/`:
   - Copy `stockfish-17-lite-single.js` and `stockfish-17-lite-single.wasm` from `temp/wintrchess/client/public/engines/`.
   - Copy/author `LICENSE` alongside them (Stockfish is GPL-3.0; include their COPYING file and a link to the source release).
   - **Flagged for later:** these binaries bloat the repo. Alternative is fetching from a CDN (Lichess or jsDelivr) at runtime. Decision: ship locally for MVP determinism; revisit in a follow-up.

2. **Copy `engine.ts`** from `temp/wintrchess/client/src/apps/features/analysis/lib/engine.ts` → `frontend/src/services/engine/UciEngine.ts`.
   - Rename default export to `UciEngine` (class name stays `Engine` if easier; re-export as `UciEngine`).
   - Keep the UCI parsing, sign-flipping for Black-to-move, and the `info depth …` regex as-is.
   - Replace `EngineVersion` import path.
   - **No behavioural changes.**

3. **Add `services/engine/EngineScheduler.ts`** (new, small — not in WintrChess in this shape):
   ```ts
   export class EngineScheduler {
     constructor(opts: { poolSize: number; engineFactory: () => UciEngine });
     evaluate(fen: string, opts: { depth: number; multiPv: number }): Promise<EngineLine[]>;
     dispose(): void;
   }
   ```
   - FIFO queue of pending requests. Engines pulled from a free-list; position set per request.
   - MVP callers pass `poolSize: 1`. Parallelization later = bump the number.

4. **Tests.**
   - `UciEngine`: pure parsing test — extract a helper `parseInfoLine(line, sideToMoveIsBlack)` and unit-test it against canned UCI strings. Worker-level tests stay manual for MVP (flagged env-gated integration test: `VITEST_RUN_ENGINE=1`).
   - `EngineScheduler`: with a fake `engineFactory` returning a mock engine, verify FIFO order, pool reuse with `poolSize=1`, and `dispose()` terminates all engines.

**Exit:** a manual Vitest/browser smoke test can evaluate any FEN end-to-end via `new EngineScheduler({ poolSize: 1, engineFactory: () => new UciEngine(...) }).evaluate(fen, { depth: 16, multiPv: 1 })`.

---

## Phase 4 — Orchestrator (`analyzeGame`)

**Goal:** PGN in → `GameAnalysis` out, engine-agnostic.

### Steps

1. **Define the DIP seam** `frontend/src/services/analysis/PositionProvider.ts`:
   ```ts
   export interface PositionProvider {
     evaluate(fen: string, opts: { depth: number; multiPv: number }): Promise<EngineLine[]>;
     dispose?(): void;
   }
   ```

2. **`services/analysis/LocalEngineProvider.ts`** — wraps an `EngineScheduler`, implements `PositionProvider`. Dispose forwards to scheduler.

3. **`services/analysis/analyzeGame.ts`** (new, thin):
   ```ts
   analyzeGame(
     pgn: string,
     provider: PositionProvider,
     options: {
       depth: number;
       multiPv: number;
       includeBrilliant?: boolean;   // default false for MVP
       includeCritical?: boolean;    // default false for MVP
       includeTheory?: boolean;      // default false for MVP
       onProgress?: (done: number, total: number) => void;
       signal?: AbortSignal;
     }
   ): Promise<GameAnalysis>
   ```
   Flow:
   1. Parse PGN with `chess.js`; build a `StateTreeNode` chain (root + one child per move). Fill `state.fen` and `state.move` on each node. **Reuse WintrChess's node shape so `getGameAnalysis` works as-is.**
   2. Walk nodes; for each, call `provider.evaluate(fen, { depth, multiPv })`; push result into `node.state.engineLines`. Call `onProgress` after each. Respect `signal.aborted`.
   3. Call `getGameAnalysis(rootNode, options)` (from Phase 1 — already classifies + computes accuracy).
   4. Call `getGameAccuracy(rootNode)` from `reporter/accuracy.ts`.
   5. Return `{ moves: [...serialised from node chain], accuracy: { white, black } }`.

4. **Tests.** With a fake `PositionProvider` returning canned `EngineLine`s keyed by FEN:
   - Short game, all best moves → both accuracies near 100.
   - Game with a known blunder → blunder classification + accuracy drop reflected.
   - Abort mid-analysis → rejects with `AbortError` and doesn't call classifier.
   - Progress callback fires `total` times with monotonically increasing `done`.

**Exit:** full pipeline runs in tests with zero engine.

---

## Phase 5 — Store + MatchPage wiring (the MVP)

**Goal:** user clicks "Analyze game" on the match page and sees numbers.

### Steps

1. **`stores/useAnalysisStore.ts`**
   - State:
     ```ts
     type AnalysisEntry =
       | { status: "idle" }
       | { status: "running"; progress: number }
       | { status: "done"; result: GameAnalysis; durationMs: number }
       | { status: "error"; error: string };
     type State = { byGameId: Record<string, AnalysisEntry> };
     ```
   - Actions: `startAnalysis(gameId, pgn)`, `cancelAnalysis(gameId)`, `reset(gameId)`.
   - `startAnalysis`:
     - Single-flight (no-op if already `running` or `done` for that gameId).
     - Creates a `LocalEngineProvider` with `poolSize=1`, disposes on settle.
     - Calls `analyzeGame(pgn, provider, { depth: 16, multiPv: 1, onProgress })`.
     - Writes `progress` / `result` / `error` to the store.
   - Tests: drive with a mock provider; verify state transitions.

2. **MatchPage changes** (`frontend/src/pages/MatchPage.tsx`)
   - Read the current game (including `pgn`) from `usePlayerGamesStore`.
   - Read the analysis entry for this `gameId` from `useAnalysisStore`.
   - Render:
     - `[Analyze game]` `TrackedButton` (new analytics event `analysis_run_requested`) when `status === "idle"`.
     - `Analyzing… {progress}%` when `running`.
     - `White accuracy: {white} · Black accuracy: {black}` when `done`, plus `[Show details ▾]` toggle revealing a `<pre>` JSON of per-move `{ san, classification, accuracy }`.
     - `Analysis failed: {error}` + `[Retry]` when `error`.
   - No styling work beyond the component defaults.

3. **Analytics.** Add to the `AnalyticsEvent` union in `utils/analytics.ts`:
   - `analysis_run_requested` (no props)
   - `analysis_run_completed` (`{ durationMs: number; moveCount: number }`)
   - `analysis_run_failed` (`{ reason: string }`)

4. **Tests.**
   - `useAnalysisStore.test.ts` — actions, state transitions, single-flight.
   - `MatchPage.test.tsx` — idle → click "Analyze" → shows progress → shows result; error state shows Retry; details toggle works. Mock `useAnalysisStore`.

5. **SEO.** No change — `SEOHelmet` already present on MatchPage.

**Exit criteria (MVP complete):**
- On `/player/:username/match/:gameId`, clicking "Analyze" runs the engine, updates a progress indicator, then displays two accuracy numbers and a JSON details blob.
- `npm run test`, `npm run lint`, `npm run format:check`, `npm run build` all green.
- No regressions in existing pages.

---

## Phase 6 — Deferred (explicitly out of scope, documented only)

Do **not** build in the MVP. Listed so follow-up plans are trivial to write.

- `LichessCloudProvider` + `HybridProvider` (cloud-first, break on first miss, local fallback). Copy `cloudEvaluate.ts` mostly verbatim.
- Enable brilliant/critical/theory: flip the options on, ship `openings.json`, switch to MultiPV 2. All underlying code is already copied in Phase 1.
- `localStorage` / IndexedDB cache keyed by `gameId + pgnHash + engineVersion + depth`.
- Parallel multi-game analysis: bump `EngineScheduler.poolSize` to `navigator.hardwareConcurrency - 1`; share one scheduler across `useAnalysisStore` calls via a module-level singleton.
- Real visuals: per-move annotations on a board, eval graph, classification icons, etc.
- Move Stockfish from `public/` to a CDN fetch if repo size becomes a problem.

---

## Branch & PR plan

| PR | Branch | Phase |
| --- | --- | --- |
| 1 | `feat/about-page` | Phase 0 |
| 2 | `chore/license-gpl` | Phase 1 |
| 3 | `feat/analysis-pure-core` | Phase 2 |
| 4 | `feat/analysis-engine` | Phase 3 |
| 5 | `feat/analysis-orchestrator` | Phase 4 |
| 6 | `feat/analysis-match-page-mvp` | Phase 5 |

Each PR runs `/ship` cleanly on its own.

---

## Open questions to resolve when starting each phase

- **Phase 2, step 3:** TS path aliases vs. relative paths for copied files? (Recommendation: relative.)
- **Phase 3, step 1:** commit the `.wasm` (~5 MB) or fetch from CDN? (Recommendation: commit for MVP; flag for later.)
- **Phase 5, step 2:** show details as raw JSON or a minimal formatted list? (Recommendation: raw JSON for MVP — explicitly no visuals.)

Answer these at the top of the phase's implementation chat; otherwise defaults above apply.
