// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Removed runtime zod schema; kept the structural type only.

import type { Classification } from '../constants/Classification'
import type { PieceColour } from '../constants/PieceColour'
import type { EngineLine } from './EngineLine'
import type { Move } from './Move'

export interface BoardState {
  fen: string
  move?: Move
  moveColour?: PieceColour
  engineLines: EngineLine[]
  classification?: Classification
  accuracy?: number
  opening?: string
}
