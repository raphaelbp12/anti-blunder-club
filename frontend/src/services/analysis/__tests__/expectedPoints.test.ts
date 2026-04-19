import { describe, it, expect } from 'vitest'

import {
  getExpectedPoints,
  getExpectedPointsLoss,
} from '../reporter/expectedPoints'
import PieceColour from '../constants/PieceColour'
import type { Evaluation } from '../types/Evaluation'

describe('getExpectedPoints', () => {
  it('returns 0.5 at centipawn 0', () => {
    const ev: Evaluation = { type: 'centipawn', value: 0 }
    expect(
      getExpectedPoints(ev, { moveColour: PieceColour.WHITE }),
    ).toBeCloseTo(0.5, 5)
  })

  it('returns ~0.80 at +400cp (white perspective)', () => {
    const ev: Evaluation = { type: 'centipawn', value: 400 }
    // 1 / (1 + e^(-0.0035 * 400)) = 1 / (1 + e^-1.4) ≈ 0.8021
    expect(
      getExpectedPoints(ev, { moveColour: PieceColour.WHITE }),
    ).toBeCloseTo(0.8021, 3)
  })

  it('is symmetric around 0 (cp=-400)', () => {
    const ev: Evaluation = { type: 'centipawn', value: -400 }
    expect(
      getExpectedPoints(ev, { moveColour: PieceColour.WHITE }),
    ).toBeCloseTo(1 - 0.8021, 3)
  })

  it('mate value > 0 returns 1 (winning side: white forces mate)', () => {
    const ev: Evaluation = { type: 'mate', value: 5 }
    expect(getExpectedPoints(ev, { moveColour: PieceColour.WHITE })).toBe(1)
  })

  it('mate value < 0 returns 0', () => {
    const ev: Evaluation = { type: 'mate', value: -3 }
    expect(getExpectedPoints(ev, { moveColour: PieceColour.WHITE })).toBe(0)
  })

  it('mate value 0 follows side-to-move convention', () => {
    const ev: Evaluation = { type: 'mate', value: 0 }
    expect(getExpectedPoints(ev, { moveColour: PieceColour.WHITE })).toBe(1)
    expect(getExpectedPoints(ev, { moveColour: PieceColour.BLACK })).toBe(0)
  })
})

describe('getExpectedPointsLoss', () => {
  it('is 0 when both evals equal (no loss)', () => {
    const ev: Evaluation = { type: 'centipawn', value: 50 }
    expect(getExpectedPointsLoss(ev, ev, PieceColour.WHITE)).toBeCloseTo(0, 5)
  })

  it('clamps to 0 when current eval improved for moving side', () => {
    // White moves and improves from 0 to +400
    const previous: Evaluation = { type: 'centipawn', value: 0 }
    const current: Evaluation = { type: 'centipawn', value: 400 }
    const loss = getExpectedPointsLoss(previous, current, PieceColour.WHITE)
    expect(loss).toBe(0)
  })

  it('returns positive loss when white worsens position', () => {
    // White moves and drops eval from 0 to -400
    const previous: Evaluation = { type: 'centipawn', value: 0 }
    const current: Evaluation = { type: 'centipawn', value: -400 }
    const loss = getExpectedPointsLoss(previous, current, PieceColour.WHITE)
    // 0.5 - 0.1979 ≈ 0.3021
    expect(loss).toBeCloseTo(0.3021, 3)
  })

  it('returns positive loss when black worsens position', () => {
    // Black moves and drops eval from 0 to +400 (white perspective)
    const previous: Evaluation = { type: 'centipawn', value: 0 }
    const current: Evaluation = { type: 'centipawn', value: 400 }
    const loss = getExpectedPointsLoss(previous, current, PieceColour.BLACK)
    expect(loss).toBeCloseTo(0.3021, 3)
  })
})
