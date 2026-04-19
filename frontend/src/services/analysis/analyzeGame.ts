// SPDX-License-Identifier: GPL-3.0-or-later
//
// `analyzeGame` — pure orchestrator that turns a PGN + a PositionProvider
// into a classified, accuracy-scored GameAnalysis plus per-colour game
// accuracies. Engine-agnostic: everything flows through PositionProvider.
//
// Flow:
//   1. Parse PGN with chess.js; walk the history to build a linear
//      StateTreeNode chain (root = starting position, one child per ply).
//   2. For each node (including the root) ask the provider to evaluate
//      its FEN; attach the returned EngineLines to `node.state.engineLines`.
//   3. Call getGameAnalysis (pure) to fill classification + accuracy per
//      node, then getGameAccuracy for the per-colour averages.
//   4. Serialize the mainline into a flat `moves` array for consumers
//      that don't want to walk the tree.
//
// The orchestrator never creates engines itself. It does not know about
// Web Workers, Stockfish, or HTTP. That separation is the whole point of
// the PositionProvider seam.

import { Chess } from 'chess.js'

import type { PositionProvider } from './PositionProvider'
import type { StateTreeNode } from './types/StateTreeNode'
import { getNodeChain } from './types/StateTreeNode'
import type { Classification } from './constants/Classification'
import { PieceColour } from './constants/PieceColour'
import { STARTING_FEN } from './constants/utils'
import { getGameAnalysis, type GameAnalysis } from './reporter/report'
import { getGameAccuracy } from './reporter/accuracy'

export interface AnalyzeGameOptions {
  depth: number
  multiPv: number
  includeBrilliant?: boolean
  includeCritical?: boolean
  includeTheory?: boolean
  /** Called after each position is evaluated. `total` includes the root. */
  onProgress?: (done: number, total: number) => void
  /** Optional abort signal; rejects with `AbortError` when triggered. */
  signal?: AbortSignal
}

export interface AnalyzedMove {
  san: string
  uci: string
  fen: string
  moveColour: PieceColour
  classification?: Classification
  accuracy?: number
}

export interface AnalyzeGameResult {
  moves: AnalyzedMove[]
  accuracy: { white: number; black: number }
  analysis: GameAnalysis
}

class AbortError extends Error {
  constructor() {
    super('Analysis aborted')
    this.name = 'AbortError'
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new AbortError()
}

/** Build a linear StateTreeNode chain from a PGN (no engine lines yet). */
export function buildStateTreeFromPgn(pgn: string): StateTreeNode {
  const board = new Chess()
  board.loadPgn(pgn)
  const history = board.history({ verbose: true })

  const root: StateTreeNode = {
    id: '0',
    mainline: true,
    children: [],
    state: {
      fen: STARTING_FEN,
      engineLines: [],
    },
  }

  let current = root
  history.forEach((move, i) => {
    const child: StateTreeNode = {
      id: String(i + 1),
      mainline: true,
      parent: current,
      children: [],
      state: {
        fen: move.after,
        engineLines: [],
        move: { san: move.san, uci: move.lan },
        moveColour: move.color === 'w' ? PieceColour.WHITE : PieceColour.BLACK,
      },
    }
    current.children.push(child)
    current = child
  })

  return root
}

export async function analyzeGame(
  pgn: string,
  provider: PositionProvider,
  options: AnalyzeGameOptions,
): Promise<AnalyzeGameResult> {
  throwIfAborted(options.signal)

  const root = buildStateTreeFromPgn(pgn)
  const chain = getNodeChain(root)

  const { depth, multiPv, onProgress, signal } = options
  const total = chain.length

  for (let i = 0; i < chain.length; i++) {
    throwIfAborted(signal)
    const node = chain[i]!
    // We evaluate every node's FEN — including the root — because
    // `classify()` compares each node's engine lines with its parent's.
    node.state.engineLines = await provider.evaluate(node.state.fen, {
      depth,
      multiPv,
    })
    onProgress?.(i + 1, total)
  }

  throwIfAborted(signal)

  const analysis = getGameAnalysis(root, {
    includeBrilliant: options.includeBrilliant ?? false,
    includeCritical: options.includeCritical ?? false,
    includeTheory: options.includeTheory ?? false,
  })

  const accuracy = getGameAccuracy(root)

  const moves: AnalyzedMove[] = chain
    .filter((n) => n.state.move && n.state.moveColour)
    .map((n) => ({
      san: n.state.move!.san,
      uci: n.state.move!.uci,
      fen: n.state.fen,
      moveColour: n.state.moveColour!,
      classification: n.state.classification,
      accuracy: n.state.accuracy,
    }))

  return { moves, accuracy, analysis }
}

export default analyzeGame
