// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.

import { Chess, Move } from 'chess.js'

import type { BoardState } from '../../types/BoardState'
import type { EngineLine } from '../../types/EngineLine'
import type { Evaluation } from '../../types/Evaluation'

export interface ExtractedNode {
  board: Chess
  state: BoardState
  topLine: EngineLine
  evaluation: Evaluation
  secondTopLine?: EngineLine
  secondTopMove?: Move
  secondSubjectiveEvaluation?: Evaluation
}

export interface ExtractedPreviousNode extends ExtractedNode {
  topMove: Move
  subjectiveEvaluation?: Evaluation
  playedMove?: Move
}

export interface ExtractedCurrentNode extends ExtractedNode {
  topMove?: Move
  subjectiveEvaluation: Evaluation
  playedMove: Move
}
