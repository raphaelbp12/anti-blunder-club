// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Converted from `enum` to `as const` object to satisfy
// TypeScript's `erasableSyntaxOnly` compiler option.

export const EngineVersion = {
  LICHESS_CLOUD: 'lichess-cloud',
  STOCKFISH_18_ASM: 'stockfish-18-asm.js',
  STOCKFISH_18_LITE: 'stockfish-18-lite-single.js',
  STOCKFISH_18: 'stockfish-18-single.js',
} as const

export type EngineVersion = (typeof EngineVersion)[keyof typeof EngineVersion]

export default EngineVersion
