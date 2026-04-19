// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Removed runtime zod schema; kept the structural type only.

export interface Evaluation {
  type: 'centipawn' | 'mate'
  value: number
}
