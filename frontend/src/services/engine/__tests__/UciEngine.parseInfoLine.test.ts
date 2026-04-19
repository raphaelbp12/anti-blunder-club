import { describe, it, expect } from 'vitest'

import { parseInfoLine } from '../UciEngine'
import { EngineVersion } from '../../analysis/constants/EngineVersion'

const SF = EngineVersion.STOCKFISH_17_LITE
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// After 1.e4 — Black to move.
const AFTER_E4_FEN =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

describe('parseInfoLine', () => {
  it('returns undefined for non info-depth lines', () => {
    expect(parseInfoLine('bestmove e2e4', STARTING_FEN, SF)).toBeUndefined()
    expect(parseInfoLine('readyok', STARTING_FEN, SF)).toBeUndefined()
    expect(parseInfoLine('', STARTING_FEN, SF)).toBeUndefined()
  })

  it('ignores info lines containing currmove (interim progress)', () => {
    const log = 'info depth 18 currmove e2e4 currmovenumber 1'
    expect(parseInfoLine(log, STARTING_FEN, SF)).toBeUndefined()
  })

  it('parses a centipawn pv line (White to move)', () => {
    const log =
      'info depth 20 seldepth 25 multipv 1 score cp 30 nodes 1000 nps 5000 time 200 pv e2e4 e7e5 g1f3'
    const line = parseInfoLine(log, STARTING_FEN, SF)
    expect(line).toBeDefined()
    expect(line!.depth).toBe(20)
    expect(line!.index).toBe(1)
    expect(line!.evaluation).toEqual({ type: 'centipawn', value: 30 })
    expect(line!.source).toBe(SF)
    expect(line!.moves.map((m) => m.uci)).toEqual(['e2e4', 'e7e5', 'g1f3'])
    // SAN conversion against the starting position.
    expect(line!.moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('defaults multipv to 1 when absent', () => {
    const log = 'info depth 15 score cp 10 pv e2e4'
    const line = parseInfoLine(log, STARTING_FEN, SF)
    expect(line!.index).toBe(1)
  })

  it('reads the multipv index when present', () => {
    const log = 'info depth 15 multipv 3 score cp -5 pv g1f3'
    const line = parseInfoLine(log, STARTING_FEN, SF)
    expect(line!.index).toBe(3)
  })

  it('parses mate scores', () => {
    const log = 'info depth 22 multipv 1 score mate 5 pv e2e4'
    const line = parseInfoLine(log, STARTING_FEN, SF)
    expect(line!.evaluation).toEqual({ type: 'mate', value: 5 })
  })

  it("flips score sign when it's Black's turn (White's perspective)", () => {
    // After 1.e4, Black to move. Engine reports +50 from Black's view; that
    // means White is at -50.
    const log = 'info depth 20 multipv 1 score cp 50 pv e7e5'
    const line = parseInfoLine(log, AFTER_E4_FEN, SF)
    expect(line!.evaluation).toEqual({ type: 'centipawn', value: -50 })
    // Moves from Black's pv should convert to SAN from Black's perspective.
    expect(line!.moves.map((m) => m.san)).toEqual(['e5'])
  })

  it('flips mate sign when Black to move', () => {
    const log = 'info depth 22 multipv 1 score mate -3 pv e7e5'
    const line = parseInfoLine(log, AFTER_E4_FEN, SF)
    expect(line!.evaluation).toEqual({ type: 'mate', value: 3 })
  })

  it('returns undefined when the score field is missing', () => {
    const log = 'info depth 20 multipv 1 nodes 123 pv e2e4'
    expect(parseInfoLine(log, STARTING_FEN, SF)).toBeUndefined()
  })

  it('returns undefined when the pv contains an illegal move', () => {
    const log = 'info depth 20 multipv 1 score cp 0 pv e2e5'
    expect(parseInfoLine(log, STARTING_FEN, SF)).toBeUndefined()
  })

  it('handles an empty pv by producing an empty moves list', () => {
    // Some engines report the `score` before the first pv is known.
    const log = 'info depth 1 multipv 1 score cp 0'
    const line = parseInfoLine(log, STARTING_FEN, SF)
    expect(line).toBeDefined()
    expect(line!.moves).toEqual([])
  })
})
