// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Converted from `enum` to `as const` object to satisfy
// TypeScript's `erasableSyntaxOnly` compiler option.

import { WHITE, BLACK } from 'chess.js'
import type { Color } from 'chess.js'

export const PieceColour = {
  WHITE: 'white',
  BLACK: 'black',
} as const

export type PieceColour = (typeof PieceColour)[keyof typeof PieceColour]

export function adaptPieceColour(colour: PieceColour): Color
export function adaptPieceColour(colour: Color): PieceColour

export function adaptPieceColour(colour: PieceColour | Color) {
  switch (colour) {
    case WHITE:
      return PieceColour.WHITE
    case BLACK:
      return PieceColour.BLACK
    case PieceColour.WHITE:
      return WHITE
    case PieceColour.BLACK:
      return BLACK
  }
}

export function flipPieceColour(color: Color): Color
export function flipPieceColour(color: PieceColour): PieceColour

export function flipPieceColour(colour: PieceColour | Color) {
  switch (colour) {
    case PieceColour.WHITE:
      return PieceColour.BLACK
    case PieceColour.BLACK:
      return PieceColour.WHITE
    case WHITE:
      return BLACK
    case BLACK:
      return WHITE
  }
}

export default PieceColour
