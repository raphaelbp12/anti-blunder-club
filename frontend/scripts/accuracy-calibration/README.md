# Accuracy Calibration Harness

Tools for measuring how our per-game accuracy compares to Chess.com's own
CAPS number, so we can iterate on the formula without ever touching UI.

## Pipeline

1. **`games.json`** — curated `[{ username, gameId, note? }]`.
2. **`npm run calibrate:fetch`** — downloads each game from the Chess.com
   public API and caches the raw JSON under `fixtures/<gameId>.json`.
   Idempotent: games already on disk are skipped.
3. **`npm run calibrate:analyze`** (`-- --depth=N`, default 18) — runs the
   same Stockfish 18 WASM build the app ships in production against every
   position of every fixture, caching evaluations under
   `fixtures/<gameId>.evals.json`. Reuses our own `parseInfoLine` UCI
   parser, so calibration numbers come from the exact same code path as
   the web app.
4. **`npm run calibrate:run`** — feeds the cached evaluations through our
   `getMoveAccuracy` + aggregator under one or more `AccuracyParams`
   presets and writes a timestamped Markdown + JSON report under
   `reports/`. Uses Stockfish caches when present; falls back to inline
   `[%eval ...]` PGN annotations otherwise.

Typical first-time run on a fresh clone:

```bash
npm run calibrate:fetch
npm run calibrate:analyze            # slow, produces .evals.json files
npm run calibrate:run                # cheap, re-runnable after param edits
```

After tweaking presets in `calibrate.ts`, only step 4 needs to re-run.

## Why Stockfish, not inline PGN evals

Chess.com's _public_ REST API strips `[%eval ...]` comments from PGNs
(they only appear in the browser's own analysis endpoint, which requires
auth). Running Stockfish locally gives us ground-truth evaluations we
control, at a depth of our choosing, reproducible between machines.

The inline parser is still in the codebase as a fallback for fixtures
that happen to carry annotations.

## Adding games

Pick a spread — different time controls, ratings, W/D/L results — and
add entries to `games.json`:

```json
{
  "username": "magnuscarlsen",
  "gameId": "1234567890",
  "note": "rapid win with a critical mistake midgame"
}
```

Run `calibrate:fetch` then `calibrate:analyze` to cache the new fixtures.

## Report layout

Each report captures:

- Git SHA at the time of the run
- Every `AccuracyParams` preset exercised
- Per-game row: `cc_white | ours_white | … | cc_black | ours_black | …`
- Aggregate per preset: n, MAE (overall / White / Black), RMSE, signed
  bias, max |Δ|, Pearson r between ours and Chess.com

`reports/latest.json` points at the newest run.

# Accuracy Calibration Harness

Tools for measuring how our per-game accuracy compares to Chess.com's own
CAPS number, so we can iterate on the formula without ever touching UI.

## Pipeline

1. **`games.json`** — curated `[{ username, gameId, note? }]`.
2. **`npm run calibrate:fetch`** — downloads each game from the Chess.com
   public API and caches the raw JSON under `fixtures/<gameId>.json`.
   Idempotent: re-runs skip games already on disk.
3. **`npm run calibrate:run`** — parses the inline `[%eval ...]` evals
   embedded in each PGN, feeds them through our `getGameAnalysis` +
   `getGameAccuracy` under one or more `AccuracyParams` presets, and writes
   a timestamped Markdown + JSON report under `reports/`.

## Why inline evals

Chess.com ships eval-annotated PGNs for most rated games. Parsing them
lets us calibrate our _formula_ (per-move accuracy + aggregator) without
running Stockfish locally, isolating the variable we actually want to
tune. If coverage is insufficient we'll add a Stockfish-in-Node step in a
follow-up.

## Adding games

Pick a spread — different time controls, ratings, W/D/L results. Avoid
games with no inline evals (very short, abandoned, or some unrated
games); the runner will log and skip them.

```json
{
  "username": "magnuscarlsen",
  "gameId": "1234567890",
  "note": "rapid win with a critical mistake midgame"
}
```

## Report layout

Each report captures:

- Git SHA at the time of the run
- The `AccuracyParams` preset(s) used
- Per-game row: `cc_white | ours_white | Δ | cc_black | ours_black | Δ`
- Aggregate: n, MAE, RMSE, signed bias, max |Δ|, Pearson r

`reports/latest.json` points at the newest run.
