import { Chess } from 'chess.js'

import { STARTING_FEN } from '../../constants/utils'
import EngineVersion from '../../constants/EngineVersion'
import PieceColour from '../../constants/PieceColour'
import type { StateTreeNode } from '../../types/StateTreeNode'
import type { EngineLine } from '../../types/EngineLine'
import type { Evaluation } from '../../types/Evaluation'

/**
 * Build a single engine line for a given fen + first SAN move with a
 * synthetic evaluation. Useful for testing the analyzer pipeline without
 * involving a real engine.
 */
export function buildEngineLine(
  fen: string,
  san: string,
  evaluation: Evaluation,
  options: { depth?: number; index?: number } = {},
): EngineLine {
  const board = new Chess(fen)
  const move = board.move(san)
  return {
    evaluation,
    source: EngineVersion.STOCKFISH_17,
    depth: options.depth ?? 20,
    index: options.index ?? 1,
    moves: [{ san: move.san, uci: move.lan }],
  }
}

interface NodeSpec {
  /** SAN of the move played to reach this node from its parent. */
  san: string
  /** Best engine line of the *resulting* position (drives accuracy/classify). */
  bestLine: { san: string; evaluation: Evaluation }
  /** Optional second line — required only for brilliant/critical paths. */
  secondLine?: { san: string; evaluation: Evaluation }
}

/**
 * Build a linear StateTreeNode chain from a starting FEN and a list of
 * SAN moves with synthetic engine lines. Returns the root node.
 *
 * The root carries an engine line for the starting position too (its
 * `bestLine` should be the move actually played at depth 1).
 */
export function buildLinearTree(
  startFen: string,
  rootBestLine: { san: string; evaluation: Evaluation },
  moves: NodeSpec[],
): StateTreeNode {
  const root: StateTreeNode = {
    id: '0',
    mainline: true,
    children: [],
    state: {
      fen: startFen,
      engineLines: [
        buildEngineLine(startFen, rootBestLine.san, rootBestLine.evaluation),
      ],
    },
  }

  let current = root
  moves.forEach((spec, i) => {
    const board = new Chess(current.state.fen)
    const played = board.move(spec.san)
    const fenAfter = board.fen()

    const lines: EngineLine[] = [
      buildEngineLine(fenAfter, spec.bestLine.san, spec.bestLine.evaluation),
    ]
    if (spec.secondLine) {
      lines.push(
        buildEngineLine(
          fenAfter,
          spec.secondLine.san,
          spec.secondLine.evaluation,
          { index: 2 },
        ),
      )
    }

    const child: StateTreeNode = {
      id: String(i + 1),
      mainline: true,
      parent: current,
      children: [],
      state: {
        fen: fenAfter,
        engineLines: lines,
        move: { san: played.san, uci: played.lan },
        moveColour:
          played.color === 'w' ? PieceColour.WHITE : PieceColour.BLACK,
      },
    }
    current.children.push(child)
    current = child
  })

  return root
}

export const STARTING_FEN_CONST = STARTING_FEN
