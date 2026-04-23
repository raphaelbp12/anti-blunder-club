// SPDX-License-Identifier: GPL-3.0-or-later
//
// `summarizeClassifications` — reduces a flat `AnalyzedMove[]` to
// per-colour counts of each `Classification`. Moves without a
// classification (e.g. still-running analysis) are ignored.

import type { AnalyzedMove } from './analyzeGame'
import { Classification } from './constants/Classification'
import { PieceColour } from './constants/PieceColour'

export type ClassificationCounts = Record<Classification, number>

export interface ClassificationSummary {
  white: ClassificationCounts
  black: ClassificationCounts
}

export function emptyClassificationCounts(): ClassificationCounts {
  return {
    [Classification.BRILLIANT]: 0,
    [Classification.CRITICAL]: 0,
    [Classification.BEST]: 0,
    [Classification.EXCELLENT]: 0,
    [Classification.OKAY]: 0,
    [Classification.INACCURACY]: 0,
    [Classification.RISKY]: 0,
    [Classification.MISTAKE]: 0,
    [Classification.BLUNDER]: 0,
    [Classification.THEORY]: 0,
    [Classification.FORCED]: 0,
  }
}

export function summarizeClassifications(
  moves: AnalyzedMove[],
): ClassificationSummary {
  const summary: ClassificationSummary = {
    white: emptyClassificationCounts(),
    black: emptyClassificationCounts(),
  }
  for (const move of moves) {
    if (!move.classification) continue
    const bucket =
      move.moveColour === PieceColour.WHITE ? summary.white : summary.black
    bucket[move.classification] += 1
  }
  return summary
}
