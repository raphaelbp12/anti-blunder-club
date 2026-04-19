// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// MVP changes:
//  - Local GameAnalysis type (no zod, no server-only estimatedRatings).
//  - Caller is expected to pass MVP-safe options
//    ({ includeTheory: false, includeCritical: false, includeBrilliant: false }).

import { getNodeChain } from '../types/StateTreeNode'
import type { StateTreeNode } from '../types/StateTreeNode'
import type { AnalysisOptions } from './types/AnalysisOptions'
import { adaptPieceColour } from '../constants/PieceColour'
import {
  extractCurrentStateTreeNode,
  extractPreviousStateTreeNode,
} from './utils/extractNode'
import { getOpeningName } from './utils/opening'
import { getMoveAccuracy } from './accuracy'
import { classify } from './classify'

export interface GameAnalysis {
  stateTree: StateTreeNode
}

export function getGameAnalysis(
  rootNode: StateTreeNode,
  options?: AnalysisOptions,
): GameAnalysis {
  const treeNodes = getNodeChain(rootNode)

  for (const node of treeNodes) {
    try {
      node.state.classification = classify(node, options)
    } catch {
      node.state.classification = undefined
    }

    node.state.opening = getOpeningName(node.state.fen)

    if (!node.parent) continue

    const previous = extractPreviousStateTreeNode(node.parent)
    const current = extractCurrentStateTreeNode(node)

    if (!previous || !current) continue

    node.state.accuracy = getMoveAccuracy(
      previous.evaluation,
      current.evaluation,
      adaptPieceColour(current.playedMove.color),
    )
  }

  return {
    stateTree: rootNode,
  }
}
