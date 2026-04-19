import { describe, it, expect, vi } from 'vitest'

import { EngineScheduler, type SchedulableEngine } from '../EngineScheduler'
import type { EngineLine } from '../../analysis/types/EngineLine'
import { EngineVersion } from '../../analysis/constants/EngineVersion'

function makeLine(label: string, depth = 20, index = 1): EngineLine {
  return {
    depth,
    index,
    evaluation: { type: 'centipawn', value: 0 },
    source: EngineVersion.STOCKFISH_17_LITE,
    moves: [{ uci: label, san: label }],
  }
}

interface DeferredRun {
  resolve: (lines: EngineLine[]) => void
  reject: (err: unknown) => void
  fen: string
}

/**
 * Builds a manually-controllable mock engine. Each call to `evaluate`
 * records the request, returns a pending promise, and exposes `resolveNext`
 * / `rejectNext` so tests can drive the scheduler's FIFO explicitly.
 */
function createMockEngine(id: number) {
  const pending: DeferredRun[] = []
  const calls: {
    setLineCount: number[]
    setPosition: string[]
  } = { setLineCount: [], setPosition: [] }
  let currentFen = ''
  let terminated = false

  const engine: SchedulableEngine = {
    setLineCount: (n: number) => {
      calls.setLineCount.push(n)
    },
    setPosition: (fen: string) => {
      calls.setPosition.push(fen)
      currentFen = fen
    },
    evaluate: () =>
      new Promise<EngineLine[]>((resolve, reject) => {
        pending.push({ resolve, reject, fen: currentFen })
      }),
    terminate: () => {
      terminated = true
    },
  }

  return {
    id,
    engine,
    calls,
    get terminated() {
      return terminated
    },
    get pending() {
      return pending
    },
    resolveNext(lines: EngineLine[]) {
      const next = pending.shift()
      if (!next) throw new Error(`engine ${id} has no pending evaluate`)
      next.resolve(lines)
    },
    rejectNext(err: unknown) {
      const next = pending.shift()
      if (!next) throw new Error(`engine ${id} has no pending evaluate`)
      next.reject(err)
    },
  }
}

describe('EngineScheduler', () => {
  it('rejects construction with poolSize < 1', () => {
    expect(
      () =>
        new EngineScheduler({
          poolSize: 0,
          engineFactory: () => ({}) as SchedulableEngine,
        }),
    ).toThrow()
  })

  it('lazily creates engines only when needed', () => {
    const factory = vi.fn(() => createMockEngine(0).engine)
    const scheduler = new EngineScheduler({
      poolSize: 2,
      engineFactory: factory,
    })
    expect(factory).not.toHaveBeenCalled()

    void scheduler.evaluate('fen-1', { depth: 16, multiPv: 1 })
    expect(factory).toHaveBeenCalledTimes(1)

    scheduler.dispose()
  })

  it('serves requests in FIFO order when poolSize = 1', async () => {
    const mock = createMockEngine(0)
    const scheduler = new EngineScheduler({
      poolSize: 1,
      engineFactory: () => mock.engine,
    })

    const p1 = scheduler.evaluate('fen-1', { depth: 16, multiPv: 1 })
    const p2 = scheduler.evaluate('fen-2', { depth: 16, multiPv: 1 })
    const p3 = scheduler.evaluate('fen-3', { depth: 16, multiPv: 1 })

    // Only the first request has been dispatched to the engine.
    expect(mock.pending).toHaveLength(1)
    expect(mock.calls.setPosition).toEqual(['fen-1'])

    const line1 = [makeLine('l1')]
    mock.resolveNext(line1)
    await expect(p1).resolves.toEqual(line1)

    // Now the second request is running.
    expect(mock.calls.setPosition).toEqual(['fen-1', 'fen-2'])

    const line2 = [makeLine('l2')]
    mock.resolveNext(line2)
    await expect(p2).resolves.toEqual(line2)

    const line3 = [makeLine('l3')]
    mock.resolveNext(line3)
    await expect(p3).resolves.toEqual(line3)

    // Pool reuse: exactly one engine was created and kept.
    expect(mock.calls.setPosition).toEqual(['fen-1', 'fen-2', 'fen-3'])
    scheduler.dispose()
  })

  it('configures MultiPV and position per request', async () => {
    const mock = createMockEngine(0)
    const scheduler = new EngineScheduler({
      poolSize: 1,
      engineFactory: () => mock.engine,
    })

    const promise = scheduler.evaluate('fen-x', { depth: 14, multiPv: 3 })
    expect(mock.calls.setLineCount).toEqual([3])
    expect(mock.calls.setPosition).toEqual(['fen-x'])
    mock.resolveNext([])
    await promise

    scheduler.dispose()
  })

  it('propagates per-request errors without poisoning the pool', async () => {
    const mock = createMockEngine(0)
    const scheduler = new EngineScheduler({
      poolSize: 1,
      engineFactory: () => mock.engine,
    })

    const p1 = scheduler.evaluate('fen-1', { depth: 12, multiPv: 1 })
    const p2 = scheduler.evaluate('fen-2', { depth: 12, multiPv: 1 })

    mock.rejectNext(new Error('boom'))
    await expect(p1).rejects.toThrow('boom')

    // Engine is returned to the free list and picks up the next request.
    expect(mock.calls.setPosition).toEqual(['fen-1', 'fen-2'])
    const line = [makeLine('ok')]
    mock.resolveNext(line)
    await expect(p2).resolves.toEqual(line)

    scheduler.dispose()
  })

  it('dispose terminates every engine in the pool and rejects queued requests', async () => {
    const created: ReturnType<typeof createMockEngine>[] = []
    const scheduler = new EngineScheduler({
      poolSize: 2,
      engineFactory: () => {
        const m = createMockEngine(created.length)
        created.push(m)
        return m.engine
      },
    })

    const p1 = scheduler.evaluate('fen-1', { depth: 10, multiPv: 1 })
    const p2 = scheduler.evaluate('fen-2', { depth: 10, multiPv: 1 })
    const p3 = scheduler.evaluate('fen-3', { depth: 10, multiPv: 1 }) // queued

    // Swallow the running promises' rejections ourselves.
    p1.catch(() => {})
    p2.catch(() => {})

    scheduler.dispose()

    await expect(p3).rejects.toThrow(/disposed/)

    expect(created).toHaveLength(2)
    for (const m of created) expect(m.terminated).toBe(true)
  })

  it('rejects immediately when called after dispose', async () => {
    const mock = createMockEngine(0)
    const scheduler = new EngineScheduler({
      poolSize: 1,
      engineFactory: () => mock.engine,
    })
    scheduler.dispose()
    await expect(
      scheduler.evaluate('fen-x', { depth: 10, multiPv: 1 }),
    ).rejects.toThrow(/disposed/)
  })
})
