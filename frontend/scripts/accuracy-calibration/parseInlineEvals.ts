// SPDX-License-Identifier: GPL-3.0-or-later
//
// Parser for Chess.com-style inline PGN evaluations.
//
// Chess.com annotates most rated games with `{ [%eval <score>] [%clk ...] }`
// comments after every ply. `<score>` is either a signed decimal (pawns,
// White's perspective) or `#N` / `#-N` for mate-in-N.
//
// This parser walks the PGN with chess.js and returns a parallel array of
// `Evaluation | null` — one entry per played ply, in order. `null` means
// the comment was missing or unparseable.

import { Chess } from 'chess.js'

import type { Evaluation } from '../../src/services/analysis/types/Evaluation'

const EVAL_RE = /\[%eval\s+([-#+\d.]+)\]/

export interface InlineEvalResult {
  evaluationsByPly: Array<Evaluation | null>
  pliesWithEval: number
  totalPlies: number
}

function parseEvalToken(token: string): Evaluation | null {
  const trimmed = token.trim()
  if (trimmed.startsWith('#')) {
    const n = parseInt(trimmed.slice(1), 10)
    if (Number.isNaN(n)) return null
    return { type: 'mate', value: n }
  }
  if (trimmed.startsWith('+#') || trimmed.startsWith('-#')) {
    const n = parseInt(trimmed.slice(2), 10) * (trimmed[0] === '-' ? -1 : 1)
    if (Number.isNaN(n)) return null
    return { type: 'mate', value: n }
  }
  const pawns = parseFloat(trimmed)
  if (Number.isNaN(pawns)) return null
  // Clamp to +/- 10000cp: inline evals can report extreme values for
  // forced-but-not-mating positions.
  const cp = Math.round(pawns * 100)
  return { type: 'centipawn', value: Math.max(-10000, Math.min(10000, cp)) }
}

/**
 * Walk the PGN and extract one evaluation per played ply.
 *
 * Relies on chess.js's `.history({ verbose: true })[i].comment` (chess.js
 * >= 1.0) which attaches the post-move comment — that's where Chess.com
 * puts `[%eval ...]`.
 */
export function parseInlineEvals(pgn: string): InlineEvalResult {
  const board = new Chess()
  board.loadPgn(pgn)
  const history = board.history({ verbose: true })

  const evaluationsByPly: Array<Evaluation | null> = []
  let pliesWithEval = 0

  for (const move of history) {
    const comment = (move as { comment?: string }).comment ?? ''
    const m = comment.match(EVAL_RE)
    if (!m) {
      evaluationsByPly.push(null)
      continue
    }
    const parsed = parseEvalToken(m[1])
    evaluationsByPly.push(parsed)
    if (parsed) pliesWithEval++
  }

  return {
    evaluationsByPly,
    pliesWithEval,
    totalPlies: history.length,
  }
}
