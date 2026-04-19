// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Removed runtime zod schema; kept the structural type only.

export interface Move {
  san: string
  uci: string
}
