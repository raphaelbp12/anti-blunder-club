// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Wraps a single Stockfish Web Worker as a UCI engine.
// The pure UCI-line parser is factored out as `parseInfoLine` so it can be
// unit-tested without spinning up a worker.

import { Chess } from 'chess.js'

import type { EngineLine } from '../analysis/types/EngineLine'
import type { EngineVersion } from '../analysis/constants/EngineVersion'
import { STARTING_FEN } from '../analysis/constants/utils'

// Convert UCI evaluation types to our internal ones.
const uciEvaluationTypes: Record<string, 'centipawn' | 'mate' | undefined> = {
  cp: 'centipawn',
  mate: 'mate',
}

/**
 * Parse a single `info depth …` line produced by a UCI engine into an
 * `EngineLine`. Returns `undefined` when the line is malformed or not a PV
 * line we care about (e.g. it contains `currmove`, or is missing a score).
 *
 * Pure function. `fenForSans` is the FEN the engine is currently analyzing,
 * used to convert UCI moves in the `pv` back to SAN.
 *
 * Sign convention: raw UCI scores are from the side-to-move's perspective.
 * We normalize to White's perspective, so callers get consistent numbers
 * regardless of whose turn it is.
 */
export function parseInfoLine(
  log: string,
  fenForSans: string,
  source: EngineVersion,
): EngineLine | undefined {
  if (!log.startsWith('info depth')) return undefined
  if (log.includes('currmove')) return undefined

  const depthMatch = log.match(/(?<= depth )\d+/)?.[0]
  const depth = depthMatch ? parseInt(depthMatch, 10) : NaN
  if (isNaN(depth)) return undefined

  const index = parseInt(log.match(/(?<= multipv )\d+/)?.[0] ?? '', 10) || 1

  const scoreMatches = log.match(/ score (cp|mate) (-?\d+)/)
  const evaluationType = uciEvaluationTypes[scoreMatches?.[1] ?? '']
  if (evaluationType !== 'centipawn' && evaluationType !== 'mate') {
    return undefined
  }

  let evaluationScore = parseInt(scoreMatches?.[2] ?? '', 10)
  if (isNaN(evaluationScore)) return undefined

  // Flip to White's perspective when Black is to move.
  if (fenForSans.includes(' b ')) {
    evaluationScore = -evaluationScore
  }

  const moveUcis = log.match(/ pv (.*)/)?.[1]?.split(' ') ?? []

  const moveSans: string[] = []
  const board = new Chess(fenForSans)
  for (const moveUci of moveUcis) {
    try {
      moveSans.push(board.move(moveUci).san)
    } catch {
      // An illegal move in the pv line means the line is corrupted — bail.
      return undefined
    }
  }

  return {
    depth,
    index,
    evaluation: { type: evaluationType, value: evaluationScore },
    source,
    moves: moveUcis.map((uci, i) => ({ uci, san: moveSans[i] ?? uci })),
  }
}

/** Path prefix for the Stockfish worker files served from `public/engines/`. */
const DEFAULT_ENGINE_PATH_PREFIX = '/engines/'

export interface UciEngineOptions {
  /** Stockfish build filename (e.g. `stockfish-17-lite-single.js`). */
  version: EngineVersion
  /** Override `new Worker(...)` — used by tests. */
  createWorker?: (version: EngineVersion) => Worker
  /** Override the URL prefix used when creating the default worker. */
  enginePathPrefix?: string
}

/**
 * Thin wrapper around a Stockfish Web Worker that exposes a promise-based
 * `evaluate` API returning a list of `EngineLine`s for the current position.
 */
export class UciEngine {
  private worker: Worker
  private version: EngineVersion
  private position = STARTING_FEN
  private evaluating = false

  constructor(options: UciEngineOptions) {
    this.version = options.version
    const factory =
      options.createWorker ??
      ((v: EngineVersion) =>
        new Worker(
          (options.enginePathPrefix ?? DEFAULT_ENGINE_PATH_PREFIX) + v,
        ))
    this.worker = factory(options.version)

    this.worker.postMessage('uci')
    this.setPosition(this.position)
  }

  private consumeLogs(
    command: string,
    endCondition: (logMessage: string) => boolean,
    onLogReceived?: (logMessage: string) => void,
  ): Promise<string[]> {
    if (command) this.worker.postMessage(command)

    const worker = this.worker
    const logMessages: string[] = []

    return new Promise((resolve, reject) => {
      function onMessageReceived(event: MessageEvent) {
        const message = String(event.data)
        onLogReceived?.(message)
        logMessages.push(message)

        if (endCondition(message)) {
          worker.removeEventListener('message', onMessageReceived)
          worker.removeEventListener('error', reject)
          resolve(logMessages)
        }
      }

      worker.addEventListener('message', onMessageReceived)
      worker.addEventListener('error', reject)
    })
  }

  onMessage(handler: (message: string) => void) {
    this.worker.addEventListener('message', (event) => {
      handler(String(event.data))
    })
    return this
  }

  onError(handler: (error: string) => void) {
    this.worker.addEventListener('error', (event: ErrorEvent) => {
      handler(String(event.error))
    })
    return this
  }

  terminate() {
    this.worker.postMessage('quit')
  }

  setOption(option: string, value: string) {
    this.worker.postMessage(`setoption name ${option} value ${value}`)
    return this
  }

  setLineCount(lines: number) {
    this.setOption('MultiPV', lines.toString())
    return this
  }

  setThreadCount(threads: number) {
    this.setOption('Threads', threads.toString())
    return this
  }

  setPosition(fen: string, uciMoves?: string[]) {
    if (uciMoves?.length) {
      this.worker.postMessage(`position fen ${fen} moves ${uciMoves.join(' ')}`)
      const board = new Chess(fen)
      for (const uciMove of uciMoves) {
        board.move(uciMove)
      }
      this.position = board.fen()
      return this
    }

    this.worker.postMessage(`position fen ${fen}`)
    this.position = fen
    return this
  }

  async evaluate(options: {
    depth: number
    timeLimit?: number
    onEngineLine?: (line: EngineLine) => void
  }): Promise<EngineLine[]> {
    const engineLines: EngineLine[] = []
    const maxTimeArgument = options.timeLimit
      ? `movetime ${options.timeLimit}`
      : ''

    this.evaluating = true

    await this.consumeLogs(
      `go depth ${options.depth} ${maxTimeArgument}`.trim(),
      (log) => log.startsWith('bestmove') || log.includes('depth 0'),
      (log) => {
        const line = parseInfoLine(log, this.position, this.version)
        if (!line) return
        engineLines.push(line)
        options.onEngineLine?.(line)
      },
    )

    this.evaluating = false
    return engineLines
  }

  async stopEvaluation() {
    this.worker.postMessage('stop')
    if (this.evaluating) {
      await this.consumeLogs('', (log) => log.includes('bestmove'))
    }
    this.evaluating = false
  }
}

export default UciEngine
