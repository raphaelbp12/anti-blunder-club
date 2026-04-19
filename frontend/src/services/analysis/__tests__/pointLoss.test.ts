import { describe, it, expect } from 'vitest'
import { WHITE, BLACK, type Color, type Move as ChessMove } from 'chess.js'

import { pointLossClassify } from '../reporter/classification/pointLoss'
import { Classification } from '../constants/Classification'
import type {
  ExtractedPreviousNode,
  ExtractedCurrentNode,
} from '../reporter/types/ExtractedNode'
import type { Evaluation } from '../types/Evaluation'

function makePrev(evaluation: Evaluation): ExtractedPreviousNode {
  return { evaluation } as ExtractedPreviousNode
}

function makeCurrent(
  evaluation: Evaluation,
  color: Color,
  subjectiveValue: number,
): ExtractedCurrentNode {
  const playedMove = { color } as ChessMove
  const subjectiveEvaluation: Evaluation = {
    type: evaluation.type,
    value: subjectiveValue,
  }
  return {
    evaluation,
    playedMove,
    subjectiveEvaluation,
  } as ExtractedCurrentNode
}

describe('pointLossClassify — centipawn → centipawn', () => {
  it('returns BEST for tiny loss (<0.01)', () => {
    const prev = makePrev({ type: 'centipawn', value: 50 })
    const curr = makeCurrent({ type: 'centipawn', value: 49 }, WHITE, 49)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BEST)
  })

  it('returns BLUNDER for very large loss', () => {
    const prev = makePrev({ type: 'centipawn', value: 0 })
    const curr = makeCurrent({ type: 'centipawn', value: -1000 }, WHITE, -1000)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BLUNDER)
  })

  it('classifies a black blunder symmetrically', () => {
    const prev = makePrev({ type: 'centipawn', value: 0 })
    const curr = makeCurrent({ type: 'centipawn', value: 1000 }, BLACK, -1000)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BLUNDER)
  })
})

describe('pointLossClassify — mate → centipawn', () => {
  it('returns EXCELLENT when subjective ≥ 800', () => {
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'centipawn', value: 900 }, WHITE, 900)
    expect(pointLossClassify(prev, curr)).toBe(Classification.EXCELLENT)
  })

  it('returns OKAY when 400 ≤ subjective < 800', () => {
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'centipawn', value: 500 }, WHITE, 500)
    expect(pointLossClassify(prev, curr)).toBe(Classification.OKAY)
  })

  it('returns INACCURACY when 200 ≤ subjective < 400', () => {
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'centipawn', value: 250 }, WHITE, 250)
    expect(pointLossClassify(prev, curr)).toBe(Classification.INACCURACY)
  })

  it('returns MISTAKE when 0 ≤ subjective < 200', () => {
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'centipawn', value: 50 }, WHITE, 50)
    expect(pointLossClassify(prev, curr)).toBe(Classification.MISTAKE)
  })

  it('returns BLUNDER when subjective < 0', () => {
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'centipawn', value: -100 }, WHITE, -100)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BLUNDER)
  })
})

describe('pointLossClassify — centipawn → mate', () => {
  it('returns BEST when delivering a mate (subjective > 0)', () => {
    const prev = makePrev({ type: 'centipawn', value: 200 })
    const curr = makeCurrent({ type: 'mate', value: 4 }, WHITE, 4)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BEST)
  })

  it('returns BLUNDER when allowing a near mate against (subj ≥ -2)', () => {
    const prev = makePrev({ type: 'centipawn', value: 200 })
    const curr = makeCurrent({ type: 'mate', value: 1 }, BLACK, -1)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BLUNDER)
  })

  it('returns MISTAKE when allowing a longer mate (subj in [-5,-2])', () => {
    const prev = makePrev({ type: 'centipawn', value: 200 })
    const curr = makeCurrent({ type: 'mate', value: 4 }, BLACK, -4)
    expect(pointLossClassify(prev, curr)).toBe(Classification.MISTAKE)
  })

  it('returns INACCURACY when allowing a far mate (subj < -5)', () => {
    const prev = makePrev({ type: 'centipawn', value: 200 })
    const curr = makeCurrent({ type: 'mate', value: 7 }, BLACK, -7)
    expect(pointLossClassify(prev, curr)).toBe(Classification.INACCURACY)
  })
})

describe('pointLossClassify — mate → mate', () => {
  it('returns BEST when keeping the mate (mateLoss == 0, subjective < 0)', () => {
    // Black is being mated; black plays. The "subjective < 0" branch with
    // identical mate values means the losing side delayed mate optimally.
    const prev = makePrev({ type: 'mate', value: 5 })
    const curr = makeCurrent({ type: 'mate', value: 5 }, BLACK, -5)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BEST)
  })

  it('returns BLUNDER when winning mate becomes losing mate (subj ≥ -3)', () => {
    const prev = makePrev({ type: 'mate', value: 3 })
    const curr = makeCurrent({ type: 'mate', value: -2 }, WHITE, -2)
    expect(pointLossClassify(prev, curr)).toBe(Classification.BLUNDER)
  })

  it('returns MISTAKE when winning mate becomes losing mate (subj < -3)', () => {
    const prev = makePrev({ type: 'mate', value: 3 })
    const curr = makeCurrent({ type: 'mate', value: -10 }, WHITE, -10)
    expect(pointLossClassify(prev, curr)).toBe(Classification.MISTAKE)
  })
})
