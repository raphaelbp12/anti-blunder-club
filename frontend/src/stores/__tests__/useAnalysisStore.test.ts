// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisStore, ANALYSIS_STORE_KEY } from '../useAnalysisStore'
import type { PositionProvider } from '../../services/analysis/PositionProvider'
import type { EngineLine } from '../../services/analysis/types/EngineLine'
import { EngineVersion } from '../../services/analysis/constants/EngineVersion'
import type { ChessGame } from '../../services/chessComApi'

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

/**
 * Factory that hands out a single canned provider whose `evaluate` always
 * resolves — regardless of FEN — with a line that claims the played move is
 * best. Good enough for driving state transitions.
 */
function makeAlwaysBestFactory() {
  const dispose = vi.fn()
  const evaluate = vi.fn<
    (
      fen: string,
      options: { depth: number; multiPv: number },
    ) => Promise<EngineLine[]>
  >(async () => {
    return [engineLine('e4'), engineLine('e5')]
  })
  const provider: PositionProvider = { evaluate, dispose }
  return {
    providerFactory: () => provider,
    evaluate,
    dispose,
  }
}

describe('useAnalysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.setState({ byGameId: {} })
    localStorage.removeItem(ANALYSIS_STORE_KEY)
    vi.restoreAllMocks()
  })

  it('starts with an empty byGameId map', () => {
    expect(useAnalysisStore.getState().byGameId).toEqual({})
  })

  it('transitions idle → running → done and disposes the provider', async () => {
    const { providerFactory, dispose } = makeAlwaysBestFactory()

    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory })

    const entry = useAnalysisStore.getState().byGameId['g1']
    expect(entry?.status).toBe('done')
    if (entry?.status !== 'done') throw new Error('not done')
    expect(entry.result?.moves.length).toBeGreaterThan(0)
    expect(entry.summary).toBeDefined()
    expect(entry.accuracy).toBeDefined()
    expect(entry.durationMs).toBeGreaterThanOrEqual(0)
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('is single-flight: second startAnalysis while running is a no-op', async () => {
    const first = makeAlwaysBestFactory()
    const second = makeAlwaysBestFactory()

    const p1 = useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: first.providerFactory })

    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: second.providerFactory })

    await p1

    expect(first.evaluate).toHaveBeenCalled()
    expect(second.evaluate).not.toHaveBeenCalled()
  })

  it('is single-flight: second startAnalysis after done is a no-op', async () => {
    const first = makeAlwaysBestFactory()
    const second = makeAlwaysBestFactory()

    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: first.providerFactory })

    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: second.providerFactory })

    expect(second.evaluate).not.toHaveBeenCalled()
  })

  it('records an error entry when analyze throws', async () => {
    const evaluate = vi.fn(async () => {
      throw new Error('engine blew up')
    })
    const provider: PositionProvider = { evaluate, dispose: vi.fn() }

    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: () => provider })

    const entry = useAnalysisStore.getState().byGameId['g1']
    expect(entry).toEqual({ status: 'error', error: 'engine blew up' })
  })

  it('cancelAnalysis clears the running entry', async () => {
    let resolveFirst!: (value: EngineLine[]) => void
    const evaluate = vi.fn((): Promise<EngineLine[]> => {
      return new Promise<EngineLine[]>((resolve) => {
        resolveFirst = resolve
      })
    })
    const provider: PositionProvider = { evaluate, dispose: vi.fn() }

    const run = useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory: () => provider })

    // Wait a microtask so startAnalysis writes the running entry.
    await Promise.resolve()
    expect(useAnalysisStore.getState().byGameId['g1']?.status).toBe('running')

    useAnalysisStore.getState().cancelAnalysis('g1')
    // Unblock the hanging evaluate so analyzeGame can observe the abort.
    resolveFirst([engineLine('e4')])
    await run

    expect(useAnalysisStore.getState().byGameId['g1']).toBeUndefined()
  })

  it('reset clears the entry for a given gameId', async () => {
    const { providerFactory } = makeAlwaysBestFactory()
    await useAnalysisStore
      .getState()
      .startAnalysis('g1', PGN, { providerFactory })

    expect(useAnalysisStore.getState().byGameId['g1']).toBeDefined()

    useAnalysisStore.getState().reset('g1')
    expect(useAnalysisStore.getState().byGameId['g1']).toBeUndefined()
  })

  describe('persistence', () => {
    const stubGame: ChessGame = {
      url: 'https://www.chess.com/game/live/999',
      white: { username: 'alice', rating: 1500, result: 'win' },
      black: { username: 'bob', rating: 1400, result: 'checkmated' },
      timeClass: 'blitz',
      endTime: 1711900000,
      accuracies: { white: 95.5, black: 88.2 },
    }

    it('stores the ChessGame and analysedAt timestamp on done entries', async () => {
      const { providerFactory } = makeAlwaysBestFactory()
      const before = Date.now()

      await useAnalysisStore
        .getState()
        .startAnalysis('g1', PGN, { providerFactory, game: stubGame })

      const entry = useAnalysisStore.getState().byGameId['g1']
      if (entry?.status !== 'done') throw new Error('expected done')
      expect(entry.game).toEqual(stubGame)
      expect(entry.analysedAt).toBeGreaterThanOrEqual(before)
    })

    it('persists only summary + accuracy + game (no pgn, no result)', async () => {
      const { providerFactory } = makeAlwaysBestFactory()
      const gameWithPgn = { ...stubGame, pgn: '1. e4 e5' }
      await useAnalysisStore
        .getState()
        .startAnalysis('g1', PGN, { providerFactory, game: gameWithPgn })

      const raw = localStorage.getItem(ANALYSIS_STORE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!) as {
        state: { byGameId: Record<string, unknown> }
      }
      const persisted = parsed.state.byGameId['g1'] as {
        status: string
        summary?: unknown
        accuracy?: { white: number; black: number }
        result?: unknown
        game?: { pgn?: string }
      }
      expect(persisted.status).toBe('done')
      expect(persisted.summary).toBeDefined()
      expect(persisted.accuracy).toBeDefined()
      expect(persisted.result).toBeUndefined()
      expect(persisted.game?.pgn).toBeUndefined()
    })

    it('does not persist running or error entries', async () => {
      const evaluate = vi.fn(async () => {
        throw new Error('boom')
      })
      const provider: PositionProvider = { evaluate, dispose: vi.fn() }

      await useAnalysisStore
        .getState()
        .startAnalysis('g1', PGN, { providerFactory: () => provider })

      const raw = localStorage.getItem(ANALYSIS_STORE_KEY)
      // Either the key is absent or the errored entry is absent from it.
      if (raw) {
        const parsed = JSON.parse(raw) as {
          state: { byGameId: Record<string, unknown> }
        }
        expect(parsed.state.byGameId['g1']).toBeUndefined()
      }
    })
  })
})
