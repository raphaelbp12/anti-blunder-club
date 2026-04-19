# Accuracy Analysis — Feature Roadmap

## Goal

Help players select which matches are the best material to study by analyzing accuracy data from their Chess.com games.

All analysis focuses on **the searched player only** (not the opponent). Games without accuracy data are excluded from every analysis.

---

## Tier 1 — Simple Filters (Implemented)

> Shipped in `feat/accuracy-analysis`.

1. **Lowest accuracy games** — Sort by accuracy ascending. Your worst-played games have the most lessons.
2. **Below-average accuracy** — Calculate the player's mean accuracy across all games, then flag every game below that line.

**Route:** `/player/:username/analysis`

---

## Tier 2 — Smarter Filters

1. **Low accuracy + loss** — Low accuracy games you *lost* are the most actionable: your mistakes directly caused the result.
2. **Low accuracy + win** — Games you won *despite* playing poorly. These are dangerous — they reinforce bad habits. Also great study material.
3. **Accuracy by time control** — Your blitz accuracy might be 65 while your rapid is 80. Breaking it down by time class helps the player focus on the format where they blunder most.

---

## Tier 3 — Comparative / Contextual

1. **Accuracy vs. opponent rating** — Did accuracy drop against higher-rated opponents? Or do you play sloppily against lower-rated ones? Scatter-style insight.
2. **Accuracy trend over time** — Are you improving or getting worse? A simple moving average or per-session trend.

---

## Tier 4 — Dimensional Breakdowns

Slice the accuracy data along different dimensions to surface patterns that flat lists miss.

1. **Per month** — Monthly accuracy averages to track long-term improvement or regression.
2. **Per game mode** — Separate analysis for bullet, blitz, rapid, etc. Each time control demands different skills; accuracy patterns may differ significantly.
3. **Per opening** — Accuracy grouped by opening played. Surfaces which openings the player handles well and which ones lead to poor play.

> **Data dependency:** Opening analysis requires ECO code / opening name from the Chess.com API response. This field needs verification — it may not be present in all game records or may require fetching additional data. Verify before implementing.

---

## Accuracy Formula — Calibrated Defaults

Shipped defaults (`DEFAULT_ACCURACY_PARAMS` in `src/services/analysis/reporter/AccuracyParams.ts`):

| Parameter             | Legacy (CAPS-v1) | Calibrated (current) |
| --------------------- | ---------------: | -------------------: |
| `centipawnGradient`   |           0.0035 |                0.003 |
| `moveCoefA`           |           103.16 |                  100 |
| `moveCoefK`           |                4 |                  6.5 |
| `moveCoefC`           |             3.17 |                  1.5 |
| `aggregator`          |           `mean` |  `windowed-harmonic` |
| `windowSize`          |                8 |                    6 |

The legacy values remain available as `LEGACY_ACCURACY_PARAMS` for regression tests and baseline reports.

### Why these values

The calibration harness (`frontend/scripts/accuracy-calibration/`) compares our per-game accuracy to Chess.com CAPS on a **53-game balanced corpus** analysed at **Stockfish depth 18**. A 3,402-trial grid sweep picked the winner above.

| Metric                     | Legacy defaults | Calibrated defaults |
| -------------------------- | --------------: | ------------------: |
| MAE vs CAPS                |           13.71 |                3.97 |
| Pearson r vs CAPS          |           0.944 |               0.928 |
| Bias (ours − CAPS)         |          +13.01 |               +1.02 |

### Validation

A 70 / 30 hold-out (`npm run calibrate:holdout`) keeps the winner at **rank #1 of the top-50** on the held-out 30 %, with a test-set MAE of **2.79**. Leave-one-user-out across 14 users shows the winner's MAE stays within ~1 point of the per-fold optimum on the majority of folds — no single alternative preset consistently beats it.

### Reproducing

```
cd frontend
npm run calibrate:fetch      # refresh the corpus from Chess.com (optional)
npm run calibrate:analyze -- --depth=18 --shard=0/1
npm run calibrate:sweep      # 3,402-trial grid search (~3 s with cached evals)
npm run calibrate:holdout    # random 70/30 + leave-one-user-out
```
