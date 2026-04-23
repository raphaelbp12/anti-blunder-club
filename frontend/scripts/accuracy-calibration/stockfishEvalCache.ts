// SPDX-License-Identifier: GPL-3.0-or-later
//
// Stockfish-backed evaluation cache for the calibration harness.
//
// Spawns the `stockfish` npm package's Node CLI as a child process, drives
// it via UCI over stdio, and caches `{ fen, evaluation }` pairs per game
// under `fixtures/<gameId>.evals.json`. Per-position evaluations reuse the
// same `parseInfoLine` parser the shipped app uses, so calibration numbers
// come from the exact same math (just a different transport: stdio vs a
// Web Worker).
//
// The cache is append-only per game: re-running for the same gameId only
// analyzes plies that aren't already cached.

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Chess } from 'chess.js'

import type { Evaluation } from '../../src/services/analysis/types/Evaluation'
import { parseInfoLine } from '../../src/services/engine/UciEngine'
import { EngineVersion } from '../../src/services/analysis/constants/EngineVersion'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures')
const DEFAULT_DEPTH = 18
const ENGINE_VERSION = EngineVersion.STOCKFISH_18_LITE // any value — we only need evaluation, not SAN source metadata

interface CachedPosition {
  ply: number
  fen: string
  evaluation: Evaluation
  depth: number
}

interface EvalCacheFile {
  version: 1
  gameId: string
  depth: number
  engine: 'stockfish-npm'
  positions: CachedPosition[]
}

function cachePath(gameId: string, depth: number): string {
  return resolve(FIXTURES_DIR, `${gameId}.d${depth}.evals.json`)
}

function legacyCachePath(gameId: string): string {
  return resolve(FIXTURES_DIR, `${gameId}.evals.json`)
}

function loadCache(gameId: string, depth: number): EvalCacheFile {
  const path = cachePath(gameId, depth)
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8')) as EvalCacheFile
  }
  // Legacy: single unnamed cache file. Reuse only if depth matches.
  const legacy = legacyCachePath(gameId)
  if (existsSync(legacy)) {
    const raw: EvalCacheFile = JSON.parse(readFileSync(legacy, 'utf8'))
    if (raw.depth === depth) return raw
  }
  return {
    version: 1,
    gameId,
    depth,
    engine: 'stockfish-npm',
    positions: [],
  }
}

function saveCache(cache: EvalCacheFile): void {
  writeFileSync(
    cachePath(cache.gameId, cache.depth),
    JSON.stringify(cache, null, 2),
  )
}

class StockfishStdio {
  private proc: ChildProcessWithoutNullStreams
  private buffer = ''
  private listeners: Array<(line: string) => void> = []

  constructor() {
    const require = createRequire(import.meta.url)
    const cliPath = require.resolve('stockfish/scripts/cli.js')
    this.proc = spawn(process.execPath, [cliPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc.stdout.setEncoding('utf8')
    this.proc.stdout.on('data', (chunk: string) => {
      this.buffer += chunk
      let idx: number
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trimEnd()
        this.buffer = this.buffer.slice(idx + 1)
        for (const l of this.listeners) l(line)
      }
    })
    this.proc.stderr.on('data', () => {
      // Ignore stderr — Stockfish occasionally logs NNUE loading there.
    })
  }

  send(cmd: string): void {
    this.proc.stdin.write(`${cmd}\n`)
  }

  onLine(listener: (line: string) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  async waitFor(predicate: (line: string) => boolean): Promise<string[]> {
    const lines: string[] = []
    return new Promise((resolvePromise) => {
      const off = this.onLine((line) => {
        lines.push(line)
        if (predicate(line)) {
          off()
          resolvePromise(lines)
        }
      })
    })
  }

  async quit(): Promise<void> {
    this.send('quit')
    await new Promise<void>((r) => {
      this.proc.once('exit', () => r())
      // Fallback: force-kill after 2s if it refuses to exit.
      setTimeout(() => {
        if (!this.proc.killed) this.proc.kill()
        r()
      }, 2000).unref()
    })
  }
}

export interface AnalyzeOptions {
  depth?: number
  /** Print per-position progress to stderr. */
  verbose?: boolean
}

/**
 * Analyze every position in `pgn` with Stockfish and write cached
 * evaluations to `fixtures/<gameId>.evals.json`. Returns the list of
 * evaluations in ply order, with `null` for positions that failed.
 */
export async function analyzePgn(
  gameId: string,
  pgn: string,
  options: AnalyzeOptions = {},
): Promise<Array<Evaluation | null>> {
  const depth = options.depth ?? DEFAULT_DEPTH
  mkdirSync(FIXTURES_DIR, { recursive: true })
  const cache = loadCache(gameId, depth)
  const cachedByPly = new Map<number, CachedPosition>()
  for (const p of cache.positions) cachedByPly.set(p.ply, p)

  // Build the FEN for every ply (ply 0 = starting position before White's
  // first move; ply i = position after i half-moves).
  const board = new Chess()
  board.loadPgn(pgn)
  const history = board.history({ verbose: true })
  const fens: string[] = [new Chess().fen()]
  const replay = new Chess()
  for (const move of history) {
    replay.move(move)
    fens.push(replay.fen())
  }

  const engine = new StockfishStdio()
  try {
    engine.send('uci')
    await engine.waitFor((l) => l === 'uciok')
    engine.send('setoption name MultiPV value 1')
    engine.send('isready')
    await engine.waitFor((l) => l === 'readyok')

    const out: Array<Evaluation | null> = new Array(fens.length).fill(null)

    for (let ply = 0; ply < fens.length; ply++) {
      const cached = cachedByPly.get(ply)
      if (cached) {
        out[ply] = cached.evaluation
        continue
      }
      const fen = fens[ply]
      engine.send(`position fen ${fen}`)
      engine.send(`go depth ${depth}`)
      const lines = await engine.waitFor((l) => l.startsWith('bestmove'))
      // Walk backwards to find the deepest, multipv-1 info line with a score.
      let evaluation: Evaluation | null = null
      for (let i = lines.length - 1; i >= 0; i--) {
        const parsed = parseInfoLine(lines[i], fen, ENGINE_VERSION)
        if (parsed && parsed.index === 1) {
          evaluation = parsed.evaluation
          break
        }
      }
      if (evaluation) {
        out[ply] = evaluation
        cache.positions.push({ ply, fen, evaluation, depth })
      }
      if (options.verbose) {
        process.stderr.write(
          `  ply ${String(ply).padStart(3)}: ${
            evaluation ? `${evaluation.type} ${evaluation.value}` : 'no eval'
          }\n`,
        )
      }
      // Periodic persist so a crash mid-game doesn't lose all work.
      if (ply % 8 === 0) saveCache(cache)
    }

    saveCache(cache)
    return out
  } finally {
    await engine.quit()
  }
}

/**
 * Standalone entry point: `tsx stockfishEvalCache.ts [--depth N]`.
 * Analyzes every cached fixture in `fixtures/*.json` (skipping those
 * already fully cached at the requested depth).
 */
async function main(): Promise<void> {
  const depthArg = process.argv.find((a) => a.startsWith('--depth='))
  const depth = depthArg ? parseInt(depthArg.split('=')[1], 10) : DEFAULT_DEPTH
  const shardArg = process.argv.find((a) => a.startsWith('--shard='))
  let shardIdx = 0
  let shardCount = 1
  if (shardArg) {
    const m = shardArg.split('=')[1].split('/')
    shardIdx = parseInt(m[0], 10)
    shardCount = parseInt(m[1], 10)
    if (
      Number.isNaN(shardIdx) ||
      Number.isNaN(shardCount) ||
      shardCount <= 0 ||
      shardIdx < 0 ||
      shardIdx >= shardCount
    ) {
      console.error(`Invalid --shard=${shardArg.split('=')[1]} (expected i/n)`)
      process.exit(1)
    }
  }

  if (!existsSync(FIXTURES_DIR)) {
    console.error(
      `No fixtures dir: ${FIXTURES_DIR}. Run calibrate:fetch first.`,
    )
    process.exit(1)
  }
  // Only analyze games that are in the current seed list; orphan fixtures
  // from earlier picker iterations are ignored.
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
  const fixtureFiles = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.evals.json'))
    .filter((f) => !seedIds || seedIds.has(f.replace('.json', '')))
    .sort()
    .filter((_, i) => i % shardCount === shardIdx)
    .map((f) => resolve(FIXTURES_DIR, f))

  for (const file of fixtureFiles) {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    const gameId = file.split('/').pop()!.replace('.json', '')
    if (!raw.pgn) {
      console.log(`[skip] ${gameId}: no pgn`)
      continue
    }
    console.log(`[analyze] ${gameId} (depth=${depth})`)
    const start = Date.now()
    const evals = await analyzePgn(gameId, raw.pgn, { depth, verbose: false })
    const filled = evals.filter((e): e is Evaluation => e !== null).length
    console.log(
      `  done: ${filled}/${evals.length} plies evaluated in ${((Date.now() - start) / 1000).toFixed(1)}s`,
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
