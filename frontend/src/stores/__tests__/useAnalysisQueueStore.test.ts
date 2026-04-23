// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PositionProvider } from '../../services/analysis/PositionProvider'
import type { EngineLine } from '../../services/analysis/types/EngineLine'
import { EngineVersion } from '../../services/analysis/constants/EngineVersion'
import type { ChessGame } from '../../services/chessComApi'
import { useAnalysisStore } from '../useAnalysisStore'
import { useAnalysisQueueStore } from '../useAnalysisQueueStore'

const PGN = '1. e4 e5 2. Nf3'

function engineLine(san: string): EngineLine {
  return {
    source: EngineVersion.STOCKFISH_18_LITE,
    depth: 20,
    index: 1,
    evaluation: { type: 'centipawn', value: 20 },
    moves: [{ san, uci: 'e2e4' }],
  }
}

function makeFastProviderFactory() {
  const provider: PositionProvider = {
    evaluate: vi.fn(async () => [engineLine('e4'), engineLine('e5')]),
    dispose: vi.fn(),
  }
  return () => provider
}

/**
 * Factory whose evaluate() hangs until a `resolve` is called externally.
 * Used to assert "is currently running" without racing real work.
 */
function makePendingProviderFactory() {
  let release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  const provider: PositionProvider = {
    evaluate: vi.fn(async () => {
      await gate
      return [engineLine('e4'), engineLine('e5')]
    }),
    dispose: vi.fn(),
  }
  return { factory: () => provider, release }
}

function makeGame(id: string): ChessGame {
  return {
    url: `https://www.chess.com/game/live/${id}`,
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1400, result: 'checkmated' },
    timeClass: 'blitz',
    endTime: 1711900000,
  }
}

function reset() {
  useAnalysisStore.setState({ byGameId: {} })
  useAnalysisQueueStore.setState({
    pending: [],
    running: [],
    batchTotal: 0,
    batchDone: 0,
    concurrency: 1,
  })
}

describe('useAnalysisQueueStore', () => {
  beforeEach(reset)

  describe('enqueue', () => {
    it('runs a single queued item and transitions it to done', async () => {
      const providerFactory = makeFastProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: '1',
        pgn: PGN,
        game: makeGame('1'),
        providerFactory,
      })

      // Give the microtask chain a chance to flush.
      await vi.waitFor(() => {
        expect(useAnalysisStore.getState().byGameId['1']?.status).toBe('done')
      })
      expect(useAnalysisQueueStore.getState().pending).toEqual([])
      expect(useAnalysisQueueStore.getState().running).toEqual([])
    })

    it('processes items serially at concurrency=1 (FIFO)', async () => {
      const p1 = makePendingProviderFactory()
      const p2 = makePendingProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'a',
        pgn: PGN,
        game: makeGame('a'),
        providerFactory: p1.factory,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'b',
        pgn: PGN,
        game: makeGame('b'),
        providerFactory: p2.factory,
      })

      // After enqueue, a is running, b is still pending.
      await vi.waitFor(() => {
        expect(useAnalysisQueueStore.getState().running).toEqual(['a'])
      })
      expect(
        useAnalysisQueueStore.getState().pending.map((p) => p.gameId),
      ).toEqual(['b'])

      p1.release()
      await vi.waitFor(() => {
        expect(useAnalysisQueueStore.getState().running).toEqual(['b'])
      })

      p2.release()
      await vi.waitFor(() => {
        expect(useAnalysisQueueStore.getState().running).toEqual([])
        expect(useAnalysisStore.getState().byGameId['b']?.status).toBe('done')
      })
    })

    it('skips a gameId that is already done (with full result in session)', () => {
      useAnalysisStore.setState({
        byGameId: {
          already: {
            status: 'done',
            durationMs: 0,
            analysedAt: 1,
            summary: { white: {} as never, black: {} as never },
            accuracy: { white: 0, black: 0 },
            // result present means we have session data; no need to re-run.
            result: {
              moves: [],
              accuracy: { white: 0, black: 0 },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              analysis: {} as any,
            },
          },
        },
      })

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'already',
        pgn: PGN,
        game: makeGame('already'),
      })

      expect(useAnalysisQueueStore.getState().pending).toEqual([])
      expect(useAnalysisQueueStore.getState().batchTotal).toBe(0)
    })

    it('is idempotent: enqueueing the same gameId twice is a no-op', () => {
      const { factory } = makePendingProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'x',
        pgn: PGN,
        game: makeGame('x'),
        providerFactory: factory,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'x',
        pgn: PGN,
        game: makeGame('x'),
        providerFactory: factory,
      })

      const { pending, running, batchTotal } = useAnalysisQueueStore.getState()
      expect(pending.length + running.length).toBe(1)
      expect(batchTotal).toBe(1)
    })
  })

  describe('progress counters', () => {
    it('tracks batchTotal / batchDone across the run and resets when empty', async () => {
      const f1 = makeFastProviderFactory()
      const f2 = makeFastProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'c1',
        pgn: PGN,
        game: makeGame('c1'),
        providerFactory: f1,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'c2',
        pgn: PGN,
        game: makeGame('c2'),
        providerFactory: f2,
      })
      expect(useAnalysisQueueStore.getState().batchTotal).toBe(2)

      await vi.waitFor(() => {
        const { pending, running } = useAnalysisQueueStore.getState()
        expect(pending.length + running.length).toBe(0)
      })
      // Counters reset once the queue drains.
      expect(useAnalysisQueueStore.getState().batchTotal).toBe(0)
      expect(useAnalysisQueueStore.getState().batchDone).toBe(0)
    })
  })

  describe('cancel', () => {
    it('removes a pending item without touching running analyses', async () => {
      const p1 = makePendingProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'a',
        pgn: PGN,
        game: makeGame('a'),
        providerFactory: p1.factory,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'b',
        pgn: PGN,
        game: makeGame('b'),
        providerFactory: makeFastProviderFactory(),
      })

      useAnalysisQueueStore.getState().cancel('b')

      expect(useAnalysisQueueStore.getState().pending).toEqual([])
      expect(useAnalysisQueueStore.getState().running).toEqual(['a'])
      p1.release()
    })

    it('cancelAll empties pending and aborts running', async () => {
      const p1 = makePendingProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'a',
        pgn: PGN,
        game: makeGame('a'),
        providerFactory: p1.factory,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'b',
        pgn: PGN,
        game: makeGame('b'),
        providerFactory: makeFastProviderFactory(),
      })

      await vi.waitFor(() => {
        expect(useAnalysisQueueStore.getState().running).toContain('a')
      })

      useAnalysisQueueStore.getState().cancelAll()
      p1.release()

      await vi.waitFor(() => {
        expect(useAnalysisQueueStore.getState().pending).toEqual([])
        expect(useAnalysisQueueStore.getState().running).toEqual([])
      })
    })
  })

  describe('isActive', () => {
    it('returns true for pending and running gameIds, false otherwise', () => {
      const p1 = makePendingProviderFactory()

      useAnalysisQueueStore.getState().enqueue({
        gameId: 'a',
        pgn: PGN,
        game: makeGame('a'),
        providerFactory: p1.factory,
      })
      useAnalysisQueueStore.getState().enqueue({
        gameId: 'b',
        pgn: PGN,
        game: makeGame('b'),
        providerFactory: makeFastProviderFactory(),
      })

      const { isActive } = useAnalysisQueueStore.getState()
      expect(isActive('a')).toBe(true)
      expect(isActive('b')).toBe(true)
      expect(isActive('nonexistent')).toBe(false)
      p1.release()
    })
  })
})
