// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, it, expect, vi } from 'vitest'
import { Chess } from 'chess.js'

import { analyzeGame, buildStateTreeFromPgn } from '../analyzeGame'
import type { PositionProvider } from '../PositionProvider'
import type { EngineLine } from '../types/EngineLine'
import type { Evaluation } from '../types/Evaluation'
import { EngineVersion } from '../constants/EngineVersion'
import { Classification } from '../constants/Classification'
import { PieceColour } from '../constants/PieceColour'
import { STARTING_FEN } from '../constants/utils'

function engineLine(
  fenForSan: string,
  san: string,
  evaluation: Evaluation,
  index = 1,
): EngineLine {
  const board = new Chess(fenForSan)
  const move = board.move(san)
  return {
    depth: 20,
    index,
    evaluation,
    source: EngineVersion.STOCKFISH_18_LITE,
    moves: [{ uci: move.lan, san: move.san }],
  }
}

/**
 * Build a PositionProvider that serves canned EngineLines keyed by FEN.
 * Returns the provider plus spies for assertions.
 */
function fakeProvider(entries: Record<string, EngineLine[]>) {
  const evaluate = vi.fn(async (fen: string): Promise<EngineLine[]> => {
    const lines = entries[fen]
    if (!lines) throw new Error(`no canned entry for fen: ${fen}`)
    return lines
  })
  const dispose = vi.fn()
  const provider: PositionProvider = { evaluate, dispose }
  return { provider, evaluate, dispose }
}

// A handful of FENs we can key canned data off.
const FEN_AFTER_E4 =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FEN_AFTER_E4_E5 =
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const FEN_AFTER_FOOLS_F3 =
  'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1'
const FEN_AFTER_FOOLS_F3_E5 =
  'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2'
const FEN_AFTER_FOOLS_G4 =
  'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'

describe('buildStateTreeFromPgn', () => {
  it('builds a linear chain matching the PGN history', () => {
    const pgn = '1. e4 e5 2. Nf3'
    const root = buildStateTreeFromPgn(pgn)
    expect(root.state.fen).toBe(STARTING_FEN)
    expect(root.children).toHaveLength(1)

    const first = root.children[0]!
    expect(first.state.move?.san).toBe('e4')
    expect(first.state.moveColour).toBe(PieceColour.WHITE)
    expect(first.parent).toBe(root)

    const second = first.children[0]!
    expect(second.state.move?.san).toBe('e5')
    expect(second.state.moveColour).toBe(PieceColour.BLACK)

    const third = second.children[0]!
    expect(third.state.move?.san).toBe('Nf3')
    expect(third.state.moveColour).toBe(PieceColour.WHITE)
    expect(third.children).toHaveLength(0)
  })
})

describe('analyzeGame', () => {
  it('produces a result for a short all-best-moves game', async () => {
    const pgn = '1. e4 e5'
    const { provider, evaluate, dispose } = fakeProvider({
      [STARTING_FEN]: [
        engineLine(STARTING_FEN, 'e4', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4]: [
        engineLine(FEN_AFTER_E4, 'e5', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4_E5]: [
        engineLine(FEN_AFTER_E4_E5, 'Nf3', { type: 'centipawn', value: 30 }),
      ],
    })

    const result = await analyzeGame(pgn, provider, { depth: 16, multiPv: 1 })

    expect(evaluate).toHaveBeenCalledTimes(3) // root + 2 plies
    expect(dispose).not.toHaveBeenCalled() // caller owns dispose
    expect(result.moves).toHaveLength(2)
    expect(result.moves.map((m) => m.san)).toEqual(['e4', 'e5'])
    expect(
      result.moves.every((m) => m.classification === Classification.BEST),
    ).toBe(true)
    // Both sides played the top move → accuracies near 100.
    expect(result.accuracy.white).toBeGreaterThan(95)
    expect(result.accuracy.black).toBeGreaterThan(95)
  })

  it('classifies a known blunder and drops accuracy for the offending side', async () => {
    // Fool's-mate setup: 1. f3 e5 2. g4 — after 2.g4 Black has mate-in-1.
    const pgn = '1. f3 e5 2. g4'
    const { provider } = fakeProvider({
      [STARTING_FEN]: [
        engineLine(STARTING_FEN, 'e4', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_FOOLS_F3]: [
        engineLine(FEN_AFTER_FOOLS_F3, 'e5', { type: 'centipawn', value: -50 }),
      ],
      [FEN_AFTER_FOOLS_F3_E5]: [
        engineLine(FEN_AFTER_FOOLS_F3_E5, 'Nc3', {
          type: 'centipawn',
          value: 30,
        }),
      ],
      [FEN_AFTER_FOOLS_G4]: [
        engineLine(FEN_AFTER_FOOLS_G4, 'Qh4', { type: 'mate', value: -1 }),
      ],
    })

    const result = await analyzeGame(pgn, provider, { depth: 16, multiPv: 1 })

    // 2.g4 is the third move in the list (white's second move).
    const g4 = result.moves.find((m) => m.san === 'g4')!
    expect(g4.moveColour).toBe(PieceColour.WHITE)
    expect(g4.classification).toBe(Classification.BLUNDER)

    // White's accuracy should be far below black's since white blundered.
    expect(result.accuracy.white).toBeLessThan(result.accuracy.black)
  })

  it('fires the progress callback once per node with monotonically increasing done', async () => {
    const pgn = '1. e4 e5'
    const { provider } = fakeProvider({
      [STARTING_FEN]: [
        engineLine(STARTING_FEN, 'e4', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4]: [
        engineLine(FEN_AFTER_E4, 'e5', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4_E5]: [
        engineLine(FEN_AFTER_E4_E5, 'Nf3', { type: 'centipawn', value: 30 }),
      ],
    })

    const progress: Array<[number, number]> = []
    await analyzeGame(pgn, provider, {
      depth: 16,
      multiPv: 1,
      onProgress: (done, total) => progress.push([done, total]),
    })

    // 3 nodes: root + 2 plies.
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('rejects with AbortError when the signal is already aborted', async () => {
    const { provider, evaluate } = fakeProvider({})
    const controller = new AbortController()
    controller.abort()

    await expect(
      analyzeGame('1. e4 e5', provider, {
        depth: 16,
        multiPv: 1,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('rejects with AbortError when aborted mid-analysis', async () => {
    const pgn = '1. e4 e5'
    const controller = new AbortController()
    const { provider, evaluate } = fakeProvider({
      [STARTING_FEN]: [
        engineLine(STARTING_FEN, 'e4', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4]: [
        engineLine(FEN_AFTER_E4, 'e5', { type: 'centipawn', value: 30 }),
      ],
      [FEN_AFTER_E4_E5]: [
        engineLine(FEN_AFTER_E4_E5, 'Nf3', { type: 'centipawn', value: 30 }),
      ],
    })

    // Abort after the first evaluate.
    evaluate.mockImplementationOnce(async () => {
      controller.abort()
      return [engineLine(STARTING_FEN, 'e4', { type: 'centipawn', value: 30 })]
    })

    await expect(
      analyzeGame(pgn, provider, {
        depth: 16,
        multiPv: 1,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })

    // Should have stopped before classifying — i.e. before the remaining evaluates.
    expect(evaluate).toHaveBeenCalledTimes(1)
  })
})
