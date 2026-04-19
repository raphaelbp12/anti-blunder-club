// SPDX-License-Identifier: GPL-3.0-or-later
//
// EngineScheduler — owns a small pool of UCI engines and a FIFO queue of
// evaluation requests. Callers ask for an `EngineLine[]` given a FEN and
// an `{ depth, multiPv }` budget; the scheduler picks a free engine,
// configures it, runs `evaluate`, and returns the result.
//
// MVP uses `poolSize = 1`. Bumping the number is the parallelization knob
// we'll turn in a later phase.

import type { EngineLine } from '../analysis/types/EngineLine'

/**
 * The subset of `UciEngine` the scheduler actually depends on. Defined as
 * an interface so tests can substitute a mock without importing Workers.
 */
export interface SchedulableEngine {
  setLineCount(lines: number): unknown
  setPosition(fen: string, uciMoves?: string[]): unknown
  evaluate(options: { depth: number }): Promise<EngineLine[]>
  terminate(): void
}

export interface EngineSchedulerOptions {
  /** Number of engines kept in the pool. MVP: 1. */
  poolSize: number
  /** Factory for creating a fresh engine on demand. */
  engineFactory: () => SchedulableEngine
}

export interface EvaluateOptions {
  depth: number
  multiPv: number
}

interface QueuedRequest {
  fen: string
  options: EvaluateOptions
  resolve: (lines: EngineLine[]) => void
  reject: (err: unknown) => void
}

/**
 * FIFO scheduler for `SchedulableEngine` instances.
 *
 * Requests are served in the order `evaluate()` was called, preserving
 * each caller's expectations — MVP depends on this because `analyzeGame`
 * walks positions sequentially.
 */
export class EngineScheduler {
  private readonly poolSize: number
  private readonly engineFactory: () => SchedulableEngine
  private readonly pool: SchedulableEngine[] = []
  private readonly free: SchedulableEngine[] = []
  private readonly queue: QueuedRequest[] = []
  private disposed = false

  constructor(options: EngineSchedulerOptions) {
    if (options.poolSize < 1) {
      throw new Error('EngineScheduler.poolSize must be >= 1')
    }
    this.poolSize = options.poolSize
    this.engineFactory = options.engineFactory
  }

  evaluate(fen: string, options: EvaluateOptions): Promise<EngineLine[]> {
    if (this.disposed) {
      return Promise.reject(new Error('EngineScheduler has been disposed'))
    }
    return new Promise<EngineLine[]>((resolve, reject) => {
      this.queue.push({ fen, options, resolve, reject })
      this.drain()
    })
  }

  private ensureEngine(): SchedulableEngine | undefined {
    if (this.free.length > 0) return this.free.pop()
    if (this.pool.length < this.poolSize) {
      const engine = this.engineFactory()
      this.pool.push(engine)
      return engine
    }
    return undefined
  }

  private drain(): void {
    while (this.queue.length > 0) {
      const engine = this.ensureEngine()
      if (!engine) return // no free engine — wait for one to come back

      const request = this.queue.shift()!
      this.runRequest(engine, request)
    }
  }

  private async runRequest(
    engine: SchedulableEngine,
    request: QueuedRequest,
  ): Promise<void> {
    try {
      engine.setLineCount(request.options.multiPv)
      engine.setPosition(request.fen)
      const lines = await engine.evaluate({ depth: request.options.depth })
      request.resolve(lines)
    } catch (err) {
      request.reject(err)
    } finally {
      if (!this.disposed) {
        this.free.push(engine)
        this.drain()
      }
    }
  }

  /** Terminate all engines and reject every queued request. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    for (const engine of this.pool) {
      try {
        engine.terminate()
      } catch {
        // Swallow — `terminate` is best-effort.
      }
    }
    this.pool.length = 0
    this.free.length = 0

    const pending = this.queue.splice(0)
    for (const request of pending) {
      request.reject(new Error('EngineScheduler disposed before completion'))
    }
  }
}

export default EngineScheduler
