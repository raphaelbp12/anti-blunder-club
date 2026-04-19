// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Converted from `enum` to `as const` object to satisfy
// TypeScript's `erasableSyntaxOnly` compiler option.

export const EngineVersion = {
  LICHESS_CLOUD: 'lichess-cloud',
  STOCKFISH_17_ASM: 'stockfish-17-asm.js',
  STOCKFISH_17_LITE: 'stockfish-17-lite-single.js',
  STOCKFISH_17: 'stockfish-17-single.js',
} as const

export type EngineVersion = (typeof EngineVersion)[keyof typeof EngineVersion]

export default EngineVersion
