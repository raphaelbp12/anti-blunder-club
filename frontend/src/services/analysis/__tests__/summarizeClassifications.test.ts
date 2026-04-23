// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest'

import type { AnalyzedMove } from '../analyzeGame'
import { Classification } from '../constants/Classification'
import { PieceColour } from '../constants/PieceColour'
import {
  summarizeClassifications,
  emptyClassificationCounts,
  type ClassificationCounts,
} from '../summarizeClassifications'

function move(
  colour: PieceColour,
  classification?: Classification,
): AnalyzedMove {
  return {
    san: 'e4',
    uci: 'e2e4',
    fen: '',
    moveColour: colour,
    classification,
  }
}

describe('summarizeClassifications', () => {
  it('returns zeroed counts for an empty move list', () => {
    const result = summarizeClassifications([])
    expect(result.white).toEqual(emptyClassificationCounts())
    expect(result.black).toEqual(emptyClassificationCounts())
  })

  it('counts classifications per colour', () => {
    const moves: AnalyzedMove[] = [
      move(PieceColour.WHITE, Classification.BLUNDER),
      move(PieceColour.WHITE, Classification.MISTAKE),
      move(PieceColour.WHITE, Classification.BEST),
      move(PieceColour.WHITE, Classification.BEST),
      move(PieceColour.BLACK, Classification.INACCURACY),
      move(PieceColour.BLACK, Classification.OKAY),
      move(PieceColour.BLACK, Classification.OKAY),
    ]
    const result = summarizeClassifications(moves)
    const expectedWhite: ClassificationCounts = {
      ...emptyClassificationCounts(),
      blunder: 1,
      mistake: 1,
      best: 2,
    }
    const expectedBlack: ClassificationCounts = {
      ...emptyClassificationCounts(),
      inaccuracy: 1,
      okay: 2,
    }
    expect(result.white).toEqual(expectedWhite)
    expect(result.black).toEqual(expectedBlack)
  })

  it('ignores moves that have no classification yet', () => {
    const moves: AnalyzedMove[] = [
      move(PieceColour.WHITE, Classification.BLUNDER),
      move(PieceColour.WHITE, undefined),
      move(PieceColour.BLACK, undefined),
    ]
    const result = summarizeClassifications(moves)
    expect(result.white.blunder).toBe(1)
    // No other counters should have ticked up from the undefined moves.
    const blackTotal = Object.values(result.black).reduce((a, b) => a + b, 0)
    expect(blackTotal).toBe(0)
  })
})
