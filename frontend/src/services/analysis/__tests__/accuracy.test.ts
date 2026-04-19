import { describe, it, expect } from 'vitest'

import { getMoveAccuracy, getGameAccuracy } from '../reporter/accuracy'
import PieceColour from '../constants/PieceColour'
import type { Evaluation } from '../types/Evaluation'
import type { StateTreeNode } from '../types/StateTreeNode'

describe('getMoveAccuracy', () => {
  it('≈ 100 when no expected-points loss', () => {
    const ev: Evaluation = { type: 'centipawn', value: 0 }
    const acc = getMoveAccuracy(ev, ev, PieceColour.WHITE)
    // 103.16 * e^0 - 3.17 = 99.99
    expect(acc).toBeCloseTo(99.99, 2)
  })

  it('matches the formula for a known small loss (~0.05)', () => {
    // White worsens from +50cp to -50cp:
    // p_prev (black to move) = 1/(1+e^(0.0035*50)) ≈ 0.4563
    // p_curr (white to move) = 1/(1+e^(0.0035*50)) ≈ 0.4563
    // loss = (1 - 0.4563) - 0.4563 ≈ 0.0875
    const previous: Evaluation = { type: 'centipawn', value: 50 }
    const current: Evaluation = { type: 'centipawn', value: -50 }
    const acc = getMoveAccuracy(previous, current, PieceColour.WHITE)
    // Stay in range: tight upper bound is no-loss (~100), lower bound comes
    // from a much larger loss. Spot-check the monotone middle zone.
    expect(acc).toBeGreaterThan(50)
    expect(acc).toBeLessThan(85)
  })

  it('monotonically decreases as loss grows', () => {
    const small = getMoveAccuracy(
      { type: 'centipawn', value: 0 },
      { type: 'centipawn', value: -100 },
      PieceColour.WHITE,
    )
    const large = getMoveAccuracy(
      { type: 'centipawn', value: 0 },
      { type: 'centipawn', value: -800 },
      PieceColour.WHITE,
    )
    expect(small).toBeGreaterThan(large)
  })
})

describe('getGameAccuracy', () => {
  function makeNode(
    accuracy: number | undefined,
    moveColour: PieceColour | undefined,
  ): StateTreeNode {
    return {
      id: Math.random().toString(),
      mainline: true,
      children: [],
      state: {
        fen: '',
        engineLines: [],
        accuracy,
        moveColour,
      },
    }
  }

  it('averages accuracies separately by colour', () => {
    // Build a chain root -> w -> b -> w -> b
    const root = makeNode(undefined, undefined)
    const w1 = makeNode(80, PieceColour.WHITE)
    const b1 = makeNode(60, PieceColour.BLACK)
    const w2 = makeNode(60, PieceColour.WHITE)
    const b2 = makeNode(40, PieceColour.BLACK)
    root.children = [w1]
    w1.children = [b1]
    b1.children = [w2]
    w2.children = [b2]

    const result = getGameAccuracy(root)
    expect(result.white).toBeCloseTo(70, 5)
    expect(result.black).toBeCloseTo(50, 5)
  })

  it('ignores nodes without an accuracy', () => {
    const root = makeNode(undefined, undefined)
    const w1 = makeNode(undefined, PieceColour.WHITE)
    const b1 = makeNode(50, PieceColour.BLACK)
    root.children = [w1]
    w1.children = [b1]

    const result = getGameAccuracy(root)
    expect(result.white).toBeNaN()
    expect(result.black).toBe(50)
  })
})
