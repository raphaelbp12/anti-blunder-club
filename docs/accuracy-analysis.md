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
