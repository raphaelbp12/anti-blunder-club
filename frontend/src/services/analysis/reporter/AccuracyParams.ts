// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tunable parameters for the accuracy pipeline.
//
// Defaults are the calibrated winner of the depth-18 grid sweep (see
// `scripts/accuracy-calibration/sweep.ts` and `docs/accuracy-analysis.md`).
// On the 53-game balanced corpus they reach MAE 3.97 / r 0.928 against
// Chess.com CAPS, vs MAE 13.71 for the legacy WintrChess / CAPS-v1
// defaults. The hold-out script (`calibrate:holdout`) validates that the
// winner is robust under random splitting.

export type AccuracyAggregator =
  | 'mean'
  | 'weighted-harmonic'
  | 'windowed-harmonic'

export interface AccuracyParams {
  /** Logistic gradient on centipawns in `expectedPoints`. Larger = steeper. */
  centipawnGradient: number
  /** Per-move mapping coefficients: `A * exp(-k * loss) - C`. */
  moveCoefA: number
  moveCoefK: number
  moveCoefC: number
  /** How per-move accuracies combine into a per-colour game accuracy. */
  aggregator: AccuracyAggregator
  /** Rolling window size (plies) for `windowed-harmonic`. */
  windowSize: number
  /** Weight exponent on volatility for `weighted-harmonic`. */
  volatilityWeightExponent: number
}

export const DEFAULT_ACCURACY_PARAMS: AccuracyParams = {
  centipawnGradient: 0.003,
  moveCoefA: 100,
  moveCoefK: 6.5,
  moveCoefC: 1.5,
  aggregator: 'windowed-harmonic',
  windowSize: 6,
  volatilityWeightExponent: 1,
}

/**
 * Legacy WintrChess / CAPS-v1 defaults. Kept for regression comparisons and
 * as the baseline row in calibration reports.
 */
export const LEGACY_ACCURACY_PARAMS: AccuracyParams = {
  centipawnGradient: 0.0035,
  moveCoefA: 103.16,
  moveCoefK: 4,
  moveCoefC: 3.17,
  aggregator: 'mean',
  windowSize: 8,
  volatilityWeightExponent: 1,
}
