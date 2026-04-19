// SPDX-License-Identifier: GPL-3.0-or-later
//
// Calibration runner.
//
// Loads every cached Chess.com fixture, extracts its inline `[%eval ...]`
// annotations, runs our per-move accuracy + configurable aggregator under
// one or more `AccuracyParams` presets, and compares the result to
// Chess.com's own `accuracies.{white,black}` field.
//
// Output: a Markdown summary + a machine-readable JSON report, both
// timestamped, plus a `reports/latest.json` pointer for quick diffing.

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Chess } from 'chess.js'

import type { Evaluation } from '../../src/services/analysis/types/Evaluation'
import {
  DEFAULT_ACCURACY_PARAMS,
  type AccuracyParams,
} from '../../src/services/analysis/reporter/AccuracyParams'
import { PieceColour } from '../../src/services/analysis/constants/PieceColour'
import { getMoveAccuracy } from '../../src/services/analysis/reporter/accuracy'
import { aggregateAccuraciesForCalibration } from './aggregateForCalibration'
import { parseInlineEvals } from './parseInlineEvals'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname)
const FIXTURES_DIR = resolve(ROOT, 'fixtures')
const REPORTS_DIR = resolve(ROOT, 'reports')

const MIN_EVAL_COVERAGE = 0.9
const STARTING_POSITION_EVAL: Evaluation = { type: 'centipawn', value: 0 }

interface RawFixture {
  url: string
  pgn?: string
  accuracies?: { white: number; black: number }
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
  time_control?: string
  rated?: boolean
  end_time: number
}

interface Preset {
  name: string
  description: string
  params: AccuracyParams
}

interface GameRow {
  gameId: string
  timeClass: string
  whitePlayer: string
  blackPlayer: string
  whiteRating: number
  blackRating: number
  result: string
  chessComWhite: number
  chessComBlack: number
  oursByPreset: Record<string, { white: number; black: number }>
}

interface AggregateStats {
  n: number
  maeWhite: number
  maeBlack: number
  mae: number
  rmse: number
  meanBias: number
  maxAbs: number
  pearson: number
}

interface Report {
  generatedAt: string
  gitSha: string
  presets: Preset[]
  games: GameRow[]
  statsByPreset: Record<string, AggregateStats>
}

const PRESETS: Preset[] = [
  {
    name: 'baseline',
    description:
      'Current shipped formula: CAPS-v1 coefficients, arithmetic mean.',
    params: { ...DEFAULT_ACCURACY_PARAMS },
  },
  {
    name: 'windowed-harmonic-8',
    description:
      'CAPS-v1 per-move, sliding-window harmonic mean (size 8) aggregator.',
    params: {
      ...DEFAULT_ACCURACY_PARAMS,
      aggregator: 'windowed-harmonic',
      windowSize: 8,
    },
  },
  {
    name: 'weighted-harmonic',
    description: 'CAPS-v1 per-move, volatility-weighted harmonic aggregator.',
    params: {
      ...DEFAULT_ACCURACY_PARAMS,
      aggregator: 'weighted-harmonic',
      volatilityWeightExponent: 1.5,
    },
  },
  {
    name: 'steeper-gradient',
    description:
      'Steeper centipawn gradient (0.0045) with arithmetic mean: checks how much EP shape alone matters.',
    params: {
      ...DEFAULT_ACCURACY_PARAMS,
      centipawnGradient: 0.0045,
    },
  },
  {
    name: 'caps2-like',
    description:
      'Combined tweak: steeper gradient + sharper per-move decay + windowed harmonic aggregator.',
    params: {
      ...DEFAULT_ACCURACY_PARAMS,
      centipawnGradient: 0.0045,
      moveCoefA: 100,
      moveCoefK: 5.5,
      moveCoefC: 0,
      aggregator: 'windowed-harmonic',
      windowSize: 8,
    },
  },
]

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function listFixtureFiles(): string[] {
  if (!existsSync(FIXTURES_DIR)) return []
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => resolve(FIXTURES_DIR, f))
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

function computeStats(rows: GameRow[], presetName: string): AggregateStats {
  const diffsWhite: number[] = []
  const diffsBlack: number[] = []
  const ccVals: number[] = []
  const oursVals: number[] = []

  for (const r of rows) {
    const o = r.oursByPreset[presetName]
    if (!o) continue
    diffsWhite.push(o.white - r.chessComWhite)
    diffsBlack.push(o.black - r.chessComBlack)
    ccVals.push(r.chessComWhite, r.chessComBlack)
    oursVals.push(o.white, o.black)
  }

  const all = [...diffsWhite, ...diffsBlack]
  const mae = all.reduce((a, b) => a + Math.abs(b), 0) / (all.length || 1)
  const maeWhite =
    diffsWhite.reduce((a, b) => a + Math.abs(b), 0) / (diffsWhite.length || 1)
  const maeBlack =
    diffsBlack.reduce((a, b) => a + Math.abs(b), 0) / (diffsBlack.length || 1)
  const rmse = Math.sqrt(
    all.reduce((a, b) => a + b * b, 0) / (all.length || 1),
  )
  const meanBias = all.reduce((a, b) => a + b, 0) / (all.length || 1)
  const maxAbs = all.reduce((m, b) => Math.max(m, Math.abs(b)), 0)

  return {
    n: rows.length,
    maeWhite,
    maeBlack,
    mae,
    rmse,
    meanBias,
    maxAbs,
    pearson: pearson(ccVals, oursVals),
  }
}

function runOneGame(
  fixture: RawFixture,
  params: AccuracyParams,
): { white: number; black: number } | null {
  if (!fixture.pgn) return null
  const { evaluationsByPly, pliesWithEval, totalPlies } = parseInlineEvals(
    fixture.pgn,
  )
  if (totalPlies === 0) return null
  if (pliesWithEval / totalPlies < MIN_EVAL_COVERAGE) return null

  const board = new Chess()
  board.loadPgn(fixture.pgn)
  const history = board.history({ verbose: true })

  const whiteAccuracies: number[] = []
  const blackAccuracies: number[] = []

  let prevEval: Evaluation = STARTING_POSITION_EVAL

  for (let i = 0; i < history.length; i++) {
    const currEval = evaluationsByPly[i]
    if (!currEval) {
      // Keep the chain contiguous if a single comment is missing.
      continue
    }
    const colour =
      history[i].color === 'w' ? PieceColour.WHITE : PieceColour.BLACK
    const acc = getMoveAccuracy(prevEval, currEval, colour, params)
    if (colour === PieceColour.WHITE) whiteAccuracies.push(acc)
    else blackAccuracies.push(acc)
    prevEval = currEval
  }

  return {
    white: aggregateAccuraciesForCalibration(whiteAccuracies, params),
    black: aggregateAccuraciesForCalibration(blackAccuracies, params),
  }
}

function formatReport(report: Report): string {
  const lines: string[] = []
  lines.push(`# Accuracy Calibration Report`)
  lines.push(``)
  lines.push(`- Generated: \`${report.generatedAt}\``)
  lines.push(`- Git SHA: \`${report.gitSha}\``)
  lines.push(`- Games analyzed: ${report.games.length}`)
  lines.push(``)
  lines.push(`## Presets`)
  lines.push(``)
  for (const p of report.presets) {
    lines.push(`### \`${p.name}\``)
    lines.push(p.description)
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(p.params, null, 2))
    lines.push('```')
    lines.push('')
  }

  lines.push(`## Aggregate stats (all games)`)
  lines.push('')
  lines.push(
    `| preset | n | MAE | MAE-W | MAE-B | RMSE | bias | max |Δ| | Pearson r |`,
  )
  lines.push(
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
  )
  for (const p of report.presets) {
    const s = report.statsByPreset[p.name]
    if (!s) continue
    lines.push(
      `| ${p.name} | ${s.n} | ${s.mae.toFixed(2)} | ${s.maeWhite.toFixed(2)} | ${s.maeBlack.toFixed(2)} | ${s.rmse.toFixed(2)} | ${s.meanBias.toFixed(2)} | ${s.maxAbs.toFixed(2)} | ${s.pearson.toFixed(3)} |`,
    )
  }
  lines.push('')

  lines.push(`## Per-game results`)
  lines.push('')
  const headerCols = [
    'game',
    'W player',
    'B player',
    'time',
    'CC-W',
    'CC-B',
    ...report.presets.map((p) => `${p.name} W`),
    ...report.presets.map((p) => `${p.name} B`),
  ]
  lines.push(`| ${headerCols.join(' | ')} |`)
  lines.push(`| ${headerCols.map(() => '---').join(' | ')} |`)
  for (const g of report.games) {
    const row = [
      g.gameId,
      `${g.whitePlayer} (${g.whiteRating})`,
      `${g.blackPlayer} (${g.blackRating})`,
      g.timeClass,
      g.chessComWhite.toFixed(1),
      g.chessComBlack.toFixed(1),
      ...report.presets.map((p) =>
        g.oursByPreset[p.name]
          ? g.oursByPreset[p.name].white.toFixed(1)
          : '—',
      ),
      ...report.presets.map((p) =>
        g.oursByPreset[p.name]
          ? g.oursByPreset[p.name].black.toFixed(1)
          : '—',
      ),
    ]
    lines.push(`| ${row.join(' | ')} |`)
  }
  lines.push('')

  return lines.join('\n')
}

function main() {
  mkdirSync(REPORTS_DIR, { recursive: true })
  const files = listFixtureFiles()
  if (files.length === 0) {
    console.error(
      `No fixtures found in ${FIXTURES_DIR}. Run \`npm run calibrate:fetch\` first.`,
    )
    process.exit(1)
  }

  const games: GameRow[] = []
  const skipped: string[] = []

  for (const file of files) {
    const raw: RawFixture = JSON.parse(readFileSync(file, 'utf8'))
    const gameId = file.split('/').pop()!.replace('.json', '')
    if (!raw.pgn || !raw.accuracies) {
      skipped.push(`${gameId} (missing pgn or accuracies)`)
      continue
    }

    const oursByPreset: Record<string, { white: number; black: number }> = {}
    let atLeastOne = false
    for (const preset of PRESETS) {
      const ours = runOneGame(raw, preset.params)
      if (ours) {
        oursByPreset[preset.name] = ours
        atLeastOne = true
      }
    }
    if (!atLeastOne) {
      skipped.push(`${gameId} (insufficient inline-eval coverage)`)
      continue
    }

    games.push({
      gameId,
      timeClass: raw.time_class,
      whitePlayer: raw.white.username,
      blackPlayer: raw.black.username,
      whiteRating: raw.white.rating,
      blackRating: raw.black.rating,
      result: `${raw.white.result}/${raw.black.result}`,
      chessComWhite: raw.accuracies.white,
      chessComBlack: raw.accuracies.black,
      oursByPreset,
    })
  }

  const statsByPreset: Record<string, AggregateStats> = {}
  for (const p of PRESETS) {
    statsByPreset[p.name] = computeStats(games, p.name)
  }

  const now = new Date()
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/Z$/, 'Z')
  const report: Report = {
    generatedAt: now.toISOString(),
    gitSha: gitSha(),
    presets: PRESETS,
    games,
    statsByPreset,
  }

  const jsonPath = resolve(REPORTS_DIR, `${stamp}.json`)
  const mdPath = resolve(REPORTS_DIR, `${stamp}.md`)
  writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  writeFileSync(mdPath, formatReport(report))
  writeFileSync(
    resolve(REPORTS_DIR, 'latest.json'),
    JSON.stringify({ path: `${stamp}.json`, md: `${stamp}.md` }, null, 2),
  )

  console.log(`Report written:\n  ${mdPath}\n  ${jsonPath}`)
  if (skipped.length > 0) {
    console.log(`\nSkipped ${skipped.length} game(s):`)
    for (const s of skipped) console.log(`  - ${s}`)
  }
  console.log(`\nSummary (MAE across all games):`)
  for (const p of PRESETS) {
    const s = statsByPreset[p.name]
    console.log(
      `  ${p.name.padEnd(22)} MAE=${s.mae.toFixed(2)}  bias=${s.meanBias.toFixed(2).padStart(6)}  r=${s.pearson.toFixed(3)}`,
    )
  }
}

main()
