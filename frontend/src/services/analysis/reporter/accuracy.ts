// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.

import { meanBy } from 'lodash-es'

import { getNodeChain } from '../types/StateTreeNode'
import type { StateTreeNode } from '../types/StateTreeNode'
import type { Evaluation } from '../types/Evaluation'
import PieceColour from '../constants/PieceColour'
import { getExpectedPointsLoss } from './expectedPoints'

export function getGameAccuracy(rootNode: StateTreeNode) {
  const accuracyHolders = getNodeChain(rootNode).filter(
    (node) => node.state.accuracy != undefined,
  )

  const whiteNodes = accuracyHolders.filter(
    (node) => node.state.moveColour == PieceColour.WHITE,
  )

  const blackNodes = accuracyHolders.filter(
    (node) => node.state.moveColour == PieceColour.BLACK,
  )

  return {
    white: meanBy(whiteNodes, (node) => node.state.accuracy!),
    black: meanBy(blackNodes, (node) => node.state.accuracy!),
  }
}

export function getMoveAccuracy(
  previousEvaluation: Evaluation,
  currentEvaluation: Evaluation,
  moveColour: PieceColour,
) {
  const pointLoss = getExpectedPointsLoss(
    previousEvaluation,
    currentEvaluation,
    moveColour,
  )

  return 103.16 * Math.exp(-4 * pointLoss) - 3.17
}
