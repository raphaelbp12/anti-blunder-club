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
lets us calibrate our *formula* (per-move accuracy + aggregator) without
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
