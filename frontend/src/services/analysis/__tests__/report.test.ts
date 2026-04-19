import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'

import { getGameAnalysis } from '../reporter/report'
import { Classification } from '../constants/Classification'
import { getNodeChain } from '../types/StateTreeNode'

import { buildLinearTree } from './helpers/buildTree'

const MVP_OPTS = {
  includeTheory: false,
  includeCritical: false,
  includeBrilliant: false,
} as const

const STARTING_FEN = new Chess().fen()

describe('getGameAnalysis', () => {
  it('returns the same root node and fills accuracy + classification on each non-root node', () => {
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'e4',
          bestLine: { san: 'e5', evaluation: { type: 'centipawn', value: 30 } },
        },
        {
          san: 'e5',
          bestLine: {
            san: 'Nf3',
            evaluation: { type: 'centipawn', value: 30 },
          },
        },
      ],
    )

    const result = getGameAnalysis(root, MVP_OPTS)

    expect(result.stateTree).toBe(root)

    const chain = getNodeChain(root)
    // Root has no parent => no accuracy / no classification expected.
    expect(chain[0]!.state.accuracy).toBeUndefined()
    expect(chain[0]!.state.classification).toBeUndefined()

    // Non-root nodes get filled
    for (const node of chain.slice(1)) {
      expect(typeof node.state.accuracy).toBe('number')
      expect(node.state.classification).toBeDefined()
    }
  })

  it('classifies a played top-engine move as BEST', () => {
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'e4',
          bestLine: { san: 'e5', evaluation: { type: 'centipawn', value: 30 } },
        },
      ],
    )

    getGameAnalysis(root, MVP_OPTS)

    expect(root.children[0]!.state.classification).toBe(Classification.BEST)
  })

  it('does not throw on a node missing required engine info — classification falls back to undefined', () => {
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'e4',
          bestLine: { san: 'e5', evaluation: { type: 'centipawn', value: 30 } },
        },
      ],
    )
    // Strip engine lines from the played-move node so classify throws and
    // is caught by getGameAnalysis.
    root.children[0]!.state.engineLines = []

    expect(() => getGameAnalysis(root, MVP_OPTS)).not.toThrow()
    expect(root.children[0]!.state.classification).toBeUndefined()
  })
})
