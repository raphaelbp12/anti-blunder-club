# Accuracy Calibration — Roadmap (Phase 6.x)

Plan for shipping the calibrated accuracy formula discovered by the
depth-18 grid sweep. Each phase below is a **self-contained prompt**:
paste the phase heading + its "Prompt" block into a fresh chat to pick
up that phase.

Current state (as of commit on `feat/calibration-depth18-sweep`):

- 53-game balanced corpus, all positions evaluated at Stockfish depth 18
- Grid-sweep winner: `g=0.003, A=100, k=6.5, C=1.5, agg=windowed-harmonic, w=6`
  - MAE 3.97, bias +1.02, r 0.928
- Shipped baseline (still the default): MAE 13.71, bias +13.68, r 0.944

---

## Phase 1 — Cross-validate the grid winner (hold-out)

**Goal:** Confirm the top-ranked preset generalises before we ship it.
Cheap (all evals are cached) and protects against overfitting to the
53-game corpus.

### Prompt

> Add a `--holdout` mode to `sweep.ts` that splits the corpus into two
> deterministic halves (e.g. by `gameId` hash or user-fold). Run two
> checks:
>
> 1. **Random 70/30 split.** Rank all 3402 trials by MAE on the 70%
>    training set. Take the top 50 presets and re-rank them on the 30%
>    hold-out. Report top-10 on each side and the rank-correlation
>    (Spearman) between the two rankings.
> 2. **Leave-one-user-out.** For each of the 11 users, train on the
>    other 10, report the top-3 MAE params on that user's games.
>    Report whether the overall winner appears in the top-10 of each
>    fold.
>
> Success criterion: our grid winner (`g=0.003 A=100 k=6.5 C=1.5 w=6
windowed-harmonic`) finishes in the top-10 of the hold-out and of at
> least 9 of 11 user folds. If it doesn't, investigate which users
> disagree and why before shipping.
>
> Write the results into a new `reports/holdout-<timestamp>.md`.
> Commit on a branch `feat/calibration-holdout-validation`.

---

## Phase 2 — Refine the grid around the winner (optional)

**Goal:** Try to squeeze another 0.3–0.5 MAE with a finer local
search. Skip if Phase 1 shows the winner is already on a noisy
plateau.

### Prompt

> Extend `sweep.ts` (or add `sweep-refine.ts`) with a second, finer
> grid focused on the top-cluster neighborhood:
>
> - `centipawnGradient`: 0.0025, 0.0028, 0.003, 0.0032, 0.0035
> - `moveCoefK`: 6.0, 6.25, 6.5, 6.75, 7.0
> - `moveCoefA`: 98, 100, 102, 104
> - `moveCoefC`: 0, 0.75, 1.5, 2.25, 3.0
> - `windowSize`: 5, 6, 7, 8
> - Fixed: `aggregator=windowed-harmonic`
>
> Run on the full 53-game corpus AND on the 70% train split from Phase
>
> 1. Winner must beat the current winner (MAE 3.97) on BOTH splits by
>    ≥0.2 MAE to be adopted. Otherwise keep the current winner.
>
> Also evaluate an **affine post-correction**: fit `our' = a·our + b`
> by linear regression on the training split, apply on hold-out. If
> bias remains after the grid search, this closes it for free.
>
> Commit on `feat/calibration-refine-grid`.

---

## Phase 3 — Adopt the winner as the new shipped default

**Goal:** Make the winning preset the runtime default. This is the
user-visible change.

### Prompt

> On a new branch `feat/accuracy-new-default-params`, update the
> shipped accuracy defaults to the validated winner from Phase 1 (or
> Phase 2 if we ran it):
>
> 1. Edit `frontend/src/services/analysis/reporter/AccuracyParams.ts`:
>    update `DEFAULT_ACCURACY_PARAMS` to the new values.
> 2. Run `npm test`. Expect failures in accuracy-related tests — fix
>    each by recomputing the expected values with the new params (use
>    `tsx` in a scratch file or a temporary test hook). DO NOT loosen
>    assertions; update the golden numbers.
> 3. Update `docs/accuracy-analysis.md` with: old defaults, new
>    defaults, MAE/bias/r summary, corpus description, link to the
>    sweep report.
> 4. Run `npm run build`, `npm run lint`, `npm run format:check`.
> 5. Open a focused PR. Title:
>    `feat(accuracy): calibrated defaults (windowed-harmonic, w=6)`.
>    Body must include the before/after stats table.
>
> Do NOT touch the calibration scripts in this PR — keep it small and
> reviewable.

---

## Phase 4 — Expand corpus to stress-test the new default

**Goal:** Once the new defaults are live, grow the corpus to at least
150 games with broader coverage (low-rated, daily time class, more
draws). Surfaces failures the 53-game corpus can't.

### Prompt

> Expand `rebalanceCorpus.ts` (or create `pickGamesV3.ts`) to:
>
> 1. Target ≥150 games, max 10/user, at least 15 users.
> 2. Add user-rating buckets: < 800, 800–1200, 1200–1600, 1600–2000,
>    2000–2400, > 2400. Each bucket ≥ 15 games.
> 3. Add time-class bucket: daily, rapid, blitz, bullet — each ≥ 20
>    games.
> 4. Preserve the existing 3 explicit gameIds from the current seed
>    list.
>
> Then run `calibrate:fetch` + `calibrate:analyze --depth=18` with
> 4-way sharding (already supported). Finally re-run `calibrate:run`
> and `calibrate:sweep`.
>
> **Decision point:** if the Phase 3 winner still leads on the bigger
> corpus (within 0.3 MAE of any new contender), keep it. If a
> different preset wins by ≥0.5 MAE, open a follow-up PR with the new
> defaults.
>
> Commit on `feat/calibration-corpus-150`.

---

## Phase 5 — Observability & regression guard

**Goal:** Keep calibration from silently drifting as the formula
evolves.

### Prompt

> Add lightweight guards so future changes don't silently regress
> calibration:
>
> 1. Add a `calibrate:compare` script that takes two report JSON paths
>    and prints per-preset MAE/r deltas and per-game diffs > 3 points.
> 2. Add a small integration test (under `frontend/src/services/
analysis/__tests__/`) that loads 2–3 cached evals from
>    `scripts/accuracy-calibration/fixtures/` and asserts per-game
>    white/black accuracy stays within ±0.5 of a frozen golden value.
>    Pick three representative games (one decisive short, one long,
>    one draw).
> 3. Update `.github/instructions/` with a scoped rule for
>    `frontend/src/services/analysis/reporter/**`: "If you change
>    AccuracyParams defaults or the per-move formula, re-run
>    `npm run calibrate:run` and update the golden values in the PR."
>
> Commit on `chore/calibration-regression-guard`.

---

## Phase 6 — Clean up calibration artefacts (housekeeping)

**Goal:** Decide what stays in git vs. what gets gitignored. Current
state: ~200 JSON files committed.

### Prompt

> Review `frontend/scripts/accuracy-calibration/fixtures/` and
> `reports/`. Pick one of two policies and document it in the
> calibration `README.md`:
>
> - **Keep:** fixtures are regression data; commit them and the
>   "latest" report only. `gitignore` timestamped reports older than
>   30 days.
> - **Drop:** fixtures are reproducible from `games.json`; gitignore
>   all of `fixtures/*` and `reports/*.json/md` except `README.md` and
>   a single `reports/latest.md`.
>
> Recommended: **Keep** (cheap, and protects the integration test from
> Phase 5 from breaking if Chess.com changes their API).
>
> Also delete the one-off scripts `pickGames.ts` and `pickGamesV2.ts`
> now that `rebalanceCorpus.ts` supersedes them — or move them to a
> `scripts/accuracy-calibration/archive/` folder.
>
> Commit on `chore/calibration-housekeeping`.

---

## Dependency graph

```
Phase 1 (holdout) ──┬── Phase 3 (ship) ── Phase 4 (expand corpus)
                    │                          │
Phase 2 (refine) ───┘                          └── (loop back to Phase 3 if winner changes)

Phase 5 (regression guard) — runs in parallel with or after Phase 3
Phase 6 (cleanup) — any time after Phase 1
```

**Minimum viable path:** Phase 1 → Phase 3. The others are strongly
recommended but not blocking.
