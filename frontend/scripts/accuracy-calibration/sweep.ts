// SPDX-License-Identifier: GPL-3.0-or-later
//
// Grid-sweep calibration runner.
//
// Iterates the product of AccuracyParams variants, scores each against
// Chess.com's per-game `accuracies.{white,black}`, and writes the ranked
// top-N presets to a Markdown + JSON report.
//
// Each trial reuses the same cached Stockfish evaluations (the deepest
// depth available per game). Trials differ only in the per-ply accuracy
// formula and the aggregator.

import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Chess } from 'chess.js'

import type { Evaluation } from '../../src/services/analysis/types/Evaluation'
import {
  DEFAULT_ACCURACY_PARAMS,
  type AccuracyAggregator,
  type AccuracyParams,
} from '../../src/services/analysis/reporter/AccuracyParams'
import { PieceColour } from '../../src/services/analysis/constants/PieceColour'
import { getMoveAccuracy } from '../../src/services/analysis/reporter/accuracy'
import { aggregateAccuraciesForCalibration } from './aggregateForCalibration'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures')
const REPORTS_DIR = resolve(__dirname, 'reports')
const STARTING_POSITION_EVAL: Evaluation = { type: 'centipawn', value: 0 }

interface RawFixture {
  pgn?: string
  accuracies?: { white: number; black: number }
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
}

interface EvalCacheFile {
  depth: number
  positions: Array<{ ply: number; fen: string; evaluation: Evaluation }>
}

interface GameData {
  gameId: string
  ccWhite: number
  ccBlack: number
  /** Colour per ply index (0-based, 0 = White's first move). */
  colours: PieceColour[]
  /** Evaluation at each ply boundary. index 0 = start, 1 = after ply 0, ... */
  evaluationsByPly: Array<Evaluation | null>
  cacheDepth: number
}

interface TrialResult {
  params: AccuracyParams
  mae: number
  maeWhite: number
  maeBlack: number
  rmse: number
  bias: number
  pearson: number
  /** Composite rank score: MAE + 0.25 * |bias|. Lower is better. */
  score: number
}

// --- config: grid definition ------------------------------------------

const GRADIENTS = [0.003, 0.0035, 0.004, 0.0045, 0.005, 0.0055]
const K_VALUES = [3.5, 4, 4.5, 5, 5.5, 6, 6.5]
const A_VALUES = [100, 103.16, 106]
const C_VALUES = [0, 1.5, 3.17]
const AGGREGATORS: AccuracyAggregator[] = [
  'mean',
  'windowed-harmonic',
  'weighted-harmonic',
]
const WINDOW_SIZES = [6, 8, 10, 12]
const VOLATILITY_EXPONENTS = [0.5, 1, 1.5, 2]

const TOP_N = 30

// ----------------------------------------------------------------------

function loadDeepestCache(gameId: string): EvalCacheFile | null {
  const files = readdirSync(FIXTURES_DIR).filter(
    (f) => f.startsWith(`${gameId}.d`) && f.endsWith('.evals.json'),
  )
  let best: { path: string; depth: number } | null = null
  for (const f of files) {
    const m = f.match(/\.d(\d+)\.evals\.json$/)
    if (!m) continue
    const d = parseInt(m[1], 10)
    if (!best || d > best.depth) best = { path: resolve(FIXTURES_DIR, f), depth: d }
  }
  if (!best) return null
  try {
    return JSON.parse(readFileSync(best.path, 'utf8')) as EvalCacheFile
  } catch {
    return null
  }
}

function loadGames(minDepth: number | null): GameData[] {
  const out: GameData[] = []
  if (!existsSync(FIXTURES_DIR)) return out
  const fixtureFiles = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.evals.json'))
    .map((f) => resolve(FIXTURES_DIR, f))

  const gamesJsonPath = resolve(__dirname, 'games.json')
  const seedIds: Set<string> | null = existsSync(gamesJsonPath)
    ? new Set(
        (
          JSON.parse(readFileSync(gamesJsonPath, 'utf8')) as Array<{
            gameId: string
          }>
        ).map((e) => e.gameId),
      )
    : null

  for (const file of fixtureFiles) {
    const gameId = file.split('/').pop()!.replace('.json', '')
    if (seedIds && !seedIds.has(gameId)) continue
    const raw: RawFixture = JSON.parse(readFileSync(file, 'utf8'))
    if (!raw.pgn || !raw.accuracies) continue
    const cache = loadDeepestCache(gameId)
    if (!cache) continue
    if (minDepth !== null && cache.depth < minDepth) continue

    const board = new Chess()
    board.loadPgn(raw.pgn)
    const history = board.history({ verbose: true })
    if (history.length === 0) continue

    const byPly = new Map<number, Evaluation>()
    for (const p of cache.positions) byPly.set(p.ply, p.evaluation)
    const evaluationsByPly: Array<Evaluation | null> = []
    for (let i = 0; i <= history.length; i++) {
      evaluationsByPly.push(byPly.get(i) ?? null)
    }

    const colours: PieceColour[] = history.map((h) =>
      h.color === 'w' ? PieceColour.WHITE : PieceColour.BLACK,
    )

    out.push({
      gameId,
      ccWhite: raw.accuracies.white,
      ccBlack: raw.accuracies.black,
      colours,
      evaluationsByPly,
      cacheDepth: cache.depth,
    })
  }
  return out
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0,
    dx2 = 0,
    dy2 = 0
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

function evaluateTrial(games: GameData[], params: AccuracyParams): TrialResult {
  const diffsWhite: number[] = []
  const diffsBlack: number[] = []
  const ccVals: number[] = []
  const oursVals: number[] = []

  for (const g of games) {
    const whiteAccs: number[] = []
    const blackAccs: number[] = []
    for (let i = 0; i < g.colours.length; i++) {
      const prev = g.evaluationsByPly[i] ?? STARTING_POSITION_EVAL
      const curr = g.evaluationsByPly[i + 1]
      if (!curr) continue
      const acc = getMoveAccuracy(prev, curr, g.colours[i], params)
      if (g.colours[i] === PieceColour.WHITE) whiteAccs.push(acc)
      else blackAccs.push(acc)
    }
    if (whiteAccs.length === 0 || blackAccs.length === 0) continue
    const w = aggregateAccuraciesForCalibration(whiteAccs, params)
    const b = aggregateAccuraciesForCalibration(blackAccs, params)
    diffsWhite.push(w - g.ccWhite)
    diffsBlack.push(b - g.ccBlack)
    ccVals.push(g.ccWhite, g.ccBlack)
    oursVals.push(w, b)
  }

  const all = [...diffsWhite, ...diffsBlack]
  const n = all.length || 1
  const mae = all.reduce((a, b) => a + Math.abs(b), 0) / n
  const maeWhite =
    diffsWhite.reduce((a, b) => a + Math.abs(b), 0) / (diffsWhite.length || 1)
  const maeBlack =
    diffsBlack.reduce((a, b) => a + Math.abs(b), 0) / (diffsBlack.length || 1)
  const rmse = Math.sqrt(all.reduce((a, b) => a + b * b, 0) / n)
  const bias = all.reduce((a, b) => a + b, 0) / n
  const r = pearson(ccVals, oursVals)
  const score = mae + 0.25 * Math.abs(bias)

  return { params, mae, maeWhite, maeBlack, rmse, bias, pearson: r, score }
}

function* enumerateGrid(): Generator<AccuracyParams> {
  for (const centipawnGradient of GRADIENTS) {
    for (const moveCoefK of K_VALUES) {
      for (const moveCoefA of A_VALUES) {
        for (const moveCoefC of C_VALUES) {
          for (const aggregator of AGGREGATORS) {
            if (aggregator === 'windowed-harmonic') {
              for (const windowSize of WINDOW_SIZES) {
                yield {
                  ...DEFAULT_ACCURACY_PARAMS,
                  centipawnGradient,
                  moveCoefA,
                  moveCoefK,
                  moveCoefC,
                  aggregator,
                  windowSize,
                }
              }
            } else if (aggregator === 'weighted-harmonic') {
              for (const volatilityWeightExponent of VOLATILITY_EXPONENTS) {
                yield {
                  ...DEFAULT_ACCURACY_PARAMS,
                  centipawnGradient,
                  moveCoefA,
                  moveCoefK,
                  moveCoefC,
                  aggregator,
                  volatilityWeightExponent,
                }
              }
            } else {
              yield {
                ...DEFAULT_ACCURACY_PARAMS,
                centipawnGradient,
                moveCoefA,
                moveCoefK,
                moveCoefC,
                aggregator,
              }
            }
          }
        }
      }
    }
  }
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function formatParams(p: AccuracyParams): string {
  const parts = [
    `g=${p.centipawnGradient}`,
    `A=${p.moveCoefA}`,
    `k=${p.moveCoefK}`,
    `C=${p.moveCoefC}`,
    `agg=${p.aggregator}`,
  ]
  if (p.aggregator === 'windowed-harmonic') parts.push(`w=${p.windowSize}`)
  if (p.aggregator === 'weighted-harmonic')
    parts.push(`vExp=${p.volatilityWeightExponent}`)
  return parts.join(' ')
}

function main() {
  const depthArg = process.argv.find((a) => a.startsWith('--min-depth='))
  const minDepth = depthArg ? parseInt(depthArg.split('=')[1], 10) : null
  const topArg = process.argv.find((a) => a.startsWith('--top='))
  const topN = topArg ? parseInt(topArg.split('=')[1], 10) : TOP_N

  mkdirSync(REPORTS_DIR, { recursive: true })
  const games = loadGames(minDepth)
  if (games.length === 0) {
    console.error('No games with cached evals found.')
    process.exit(1)
  }
  const depths = new Set(games.map((g) => g.cacheDepth))
  console.log(
    `Loaded ${games.length} games (depths: ${[...depths].sort().join(', ')})`,
  )

  // Also evaluate the shipped baseline for reference.
  const baseline = evaluateTrial(games, { ...DEFAULT_ACCURACY_PARAMS })

  const results: TrialResult[] = []
  let count = 0
  const start = Date.now()
  for (const params of enumerateGrid()) {
    results.push(evaluateTrial(games, params))
    count++
    if (count % 200 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      process.stderr.write(`  trials=${count} elapsed=${elapsed}s\n`)
    }
  }
  const elapsedTotal = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`Completed ${count} trials in ${elapsedTotal}s`)

  // Rank by score (MAE + 0.25|bias|).
  results.sort((a, b) => a.score - b.score)
  const top = results.slice(0, topN)

  // Also produce rankings by pure MAE and pure r for cross-validation.
  const byMae = [...results].sort((a, b) => a.mae - b.mae).slice(0, 10)
  const byR = [...results]
    .sort((a, b) => b.pearson - a.pearson)
    .slice(0, 10)

  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z')

  // --- Markdown report ---
  const md: string[] = []
  md.push(`# Grid Sweep Report`)
  md.push('')
  md.push(`- Generated: \`${now.toISOString()}\``)
  md.push(`- Git SHA: \`${gitSha()}\``)
  md.push(`- Games: ${games.length}`)
  md.push(`- Cache depths: ${[...depths].sort().join(', ')}`)
  md.push(`- Trials: ${count}`)
  md.push(`- Score = MAE + 0.25·|bias|`)
  md.push('')
  md.push(`## Baseline (shipped defaults)`)
  md.push('')
  md.push(
    `| MAE | MAE-W | MAE-B | RMSE | bias | r | score |`,
  )
  md.push(`|---:|---:|---:|---:|---:|---:|---:|`)
  md.push(
    `| ${baseline.mae.toFixed(2)} | ${baseline.maeWhite.toFixed(2)} | ${baseline.maeBlack.toFixed(2)} | ${baseline.rmse.toFixed(2)} | ${baseline.bias.toFixed(2)} | ${baseline.pearson.toFixed(3)} | ${baseline.score.toFixed(2)} |`,
  )
  md.push('')
  md.push(`## Top ${topN} (ranked by score)`)
  md.push('')
  md.push(
    `| rank | score | MAE | MAE-W | MAE-B | RMSE | bias | r | params |`,
  )
  md.push(`|---:|---:|---:|---:|---:|---:|---:|---:|---|`)
  for (let i = 0; i < top.length; i++) {
    const t = top[i]
    md.push(
      `| ${i + 1} | ${t.score.toFixed(2)} | ${t.mae.toFixed(2)} | ${t.maeWhite.toFixed(2)} | ${t.maeBlack.toFixed(2)} | ${t.rmse.toFixed(2)} | ${t.bias.toFixed(2)} | ${t.pearson.toFixed(3)} | ${formatParams(t.params)} |`,
    )
  }
  md.push('')
  md.push(`## Top 10 by pure MAE`)
  md.push('')
  md.push(
    `| rank | MAE | bias | r | params |`,
  )
  md.push(`|---:|---:|---:|---:|---|`)
  for (let i = 0; i < byMae.length; i++) {
    const t = byMae[i]
    md.push(
      `| ${i + 1} | ${t.mae.toFixed(2)} | ${t.bias.toFixed(2)} | ${t.pearson.toFixed(3)} | ${formatParams(t.params)} |`,
    )
  }
  md.push('')
  md.push(`## Top 10 by Pearson r`)
  md.push('')
  md.push(
    `| rank | r | MAE | bias | params |`,
  )
  md.push(`|---:|---:|---:|---:|---|`)
  for (let i = 0; i < byR.length; i++) {
    const t = byR[i]
    md.push(
      `| ${i + 1} | ${t.pearson.toFixed(3)} | ${t.mae.toFixed(2)} | ${t.bias.toFixed(2)} | ${formatParams(t.params)} |`,
    )
  }
  md.push('')

  const mdPath = resolve(REPORTS_DIR, `sweep-${stamp}.md`)
  const jsonPath = resolve(REPORTS_DIR, `sweep-${stamp}.json`)
  writeFileSync(mdPath, md.join('\n'))
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        gitSha: gitSha(),
        games: games.length,
        depths: [...depths],
        trials: count,
        baseline,
        topByScore: top,
        topByMae: byMae,
        topByR: byR,
      },
      null,
      2,
    ),
  )

  console.log('\nReport written:')
  console.log(`  ${mdPath}`)
  console.log(`  ${jsonPath}`)
  console.log(
    `\nBaseline: MAE=${baseline.mae.toFixed(2)} bias=${baseline.bias.toFixed(2)} r=${baseline.pearson.toFixed(3)}`,
  )
  console.log(`Best (score):`)
  const best = top[0]
  console.log(
    `  MAE=${best.mae.toFixed(2)} bias=${best.bias.toFixed(2)} r=${best.pearson.toFixed(3)}`,
  )
  console.log(`  ${formatParams(best.params)}`)
}

main()
