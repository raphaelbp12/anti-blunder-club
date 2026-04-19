// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tunable parameters for the accuracy pipeline.
//
// Defaults reproduce the legacy WintrChess / CAPS-v1 behaviour exactly, so
// switching call sites to accept `AccuracyParams` is a zero-behaviour-change
// refactor. Calibration scripts (see `scripts/accuracy-calibration/`) pass
// non-default values to sweep the parameter space.

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
  centipawnGradient: 0.0035,
  moveCoefA: 103.16,
  moveCoefK: 4,
  moveCoefC: 3.17,
  aggregator: 'mean',
  windowSize: 8,
  volatilityWeightExponent: 1,
}
