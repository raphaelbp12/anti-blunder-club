// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisStore } from '../useAnalysisStore'
import type { PositionProvider } from '../../services/analysis/PositionProvider'
import type { EngineLine } from '../../services/analysis/types/EngineLine'
import { EngineVersion } from '../../services/analysis/constants/EngineVersion'

const PGN = '1. e4 e5 2. Nf3'

function engineLine(san: string): EngineLine {
  return {
    source: EngineVersion.STOCKFISH_17_LITE,
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
    expect(entry.result.moves.length).toBeGreaterThan(0)
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
})
