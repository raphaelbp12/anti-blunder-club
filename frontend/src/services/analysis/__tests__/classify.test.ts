import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'

import { classify } from '../reporter/classify'
import { Classification } from '../constants/Classification'
import PieceColour from '../constants/PieceColour'
import type { StateTreeNode } from '../types/StateTreeNode'

import { buildLinearTree } from './helpers/buildTree'

const MVP_OPTS = {
  includeTheory: false,
  includeCritical: false,
  includeBrilliant: false,
} as const

const STARTING_FEN = new Chess().fen()

describe('classify', () => {
  it('throws when node has no parent', () => {
    const root: StateTreeNode = {
      id: '0',
      mainline: true,
      children: [],
      state: { fen: STARTING_FEN, engineLines: [] },
    }
    expect(() => classify(root, MVP_OPTS)).toThrow()
  })

  it('returns BEST when the played move equals the engine top move', () => {
    // Engine for starting position recommends e4. White plays e4.
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'e4',
          // After 1.e4 the engine likes 1...e5 most.
          bestLine: { san: 'e5', evaluation: { type: 'centipawn', value: 30 } },
        },
      ],
    )
    const node = root.children[0]!
    expect(classify(node, MVP_OPTS)).toBe(Classification.BEST)
  })

  it('falls back to point-loss classification when not the top move', () => {
    // Engine prefers e4; white plays a3 instead, big drop.
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'a3',
          // Eval after 1.a3 (with black to move): engine still recommends e5
          // and shows ~0 for black. From white's POV, eval went 30 -> -300 — loss.
          bestLine: {
            san: 'e5',
            evaluation: { type: 'centipawn', value: -300 },
          },
        },
      ],
    )
    const node = root.children[0]!
    const result = classify(node, MVP_OPTS)
    expect([
      Classification.MISTAKE,
      Classification.BLUNDER,
      Classification.INACCURACY,
    ]).toContain(result)
  })

  it('returns FORCED when only one legal move existed in the previous position', () => {
    // Position with only one legal move: white king must move.
    // FEN: black queen gives check to white king on e1, only Kxe2 (or Kf1) is legal.
    // Use a real one-legal-move position: white king on h1, black queen on h2 (mate? no — Kxh2 if undefended).
    // Construct: white king h1, black queen h2 defended by black king on h3. Then Kg1 only legal? Actually Kxh2 illegal because defended. Kg1 is legal -> 1 move. Let's build it.
    // Only legal move for white in this position is Ke2.
    const oneMoveFen = '7k/8/7p/b7/6n1/8/P7/R3K2q w Q - 0 1'
    const board = new Chess(oneMoveFen)
    // Sanity: exactly one legal move.
    expect(board.moves()).toHaveLength(1)

    const onlyMoveSan = board.moves()[0]!
    // Compute a legal reply after playing the only move.
    const afterBoard = new Chess(oneMoveFen)
    afterBoard.move(onlyMoveSan)
    const firstReply = afterBoard.moves()[0]!

    const root = buildLinearTree(
      oneMoveFen,
      { san: onlyMoveSan, evaluation: { type: 'centipawn', value: 0 } },
      [
        {
          san: onlyMoveSan,
          bestLine: {
            san: firstReply,
            evaluation: { type: 'mate', value: -1 },
          },
        },
      ],
    )
    const node = root.children[0]!
    expect(classify(node, MVP_OPTS)).toBe(Classification.FORCED)
  })

  it('classifies a move that allows mate against as a blunder (centipawn → mate)', () => {
    // Fool's-mate setup: 1.f3 e5 2.g4 ??, with the engine now showing mate-in-1 against white.
    // Classify the 2.g4 node: previous eval was centipawn (roughly even), current eval is mate vs white.
    const root = buildLinearTree(
      STARTING_FEN,
      { san: 'e4', evaluation: { type: 'centipawn', value: 30 } },
      [
        {
          san: 'f3',
          bestLine: {
            san: 'e5',
            evaluation: { type: 'centipawn', value: -50 },
          },
        },
        {
          san: 'e5',
          bestLine: { san: 'g3', evaluation: { type: 'centipawn', value: 50 } },
        },
        {
          san: 'g4',
          // After 2.g4, engine says mate-in-1 for black (negative from white POV).
          bestLine: { san: 'Qh4', evaluation: { type: 'mate', value: -1 } },
        },
      ],
    )
    // Walk to the 2.g4 node (the last child).
    let node: StateTreeNode = root
    while (node.children[0]) node = node.children[0]

    // Sanity: this was white's move, subjective eval is mate-against-white.
    expect(node.state.moveColour).toBe(PieceColour.WHITE)

    expect(classify(node, MVP_OPTS)).toBe(Classification.BLUNDER)
  })
})
