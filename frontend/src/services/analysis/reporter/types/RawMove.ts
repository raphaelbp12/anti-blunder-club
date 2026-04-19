// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.

import { Move } from 'chess.js'
import type { Square, PieceSymbol, Color } from 'chess.js'

export interface RawMove {
  piece: PieceSymbol
  color: Color
  from: Square
  to: Square
  promotion?: PieceSymbol
}

export function toRawMove(move: Move): RawMove {
  return {
    piece: move.piece,
    color: move.color,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  }
}
