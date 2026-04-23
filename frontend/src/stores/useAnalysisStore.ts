// SPDX-License-Identifier: GPL-3.0-or-later
//
// useAnalysisStore — tracks the state of each per-game analysis run.
//
// One entry per gameId. Single-flight: calling `startAnalysis` while an
// entry is `running` or already `done` is a no-op. The store owns the
// lifecycle of the PositionProvider it creates: it disposes the provider
// when the run settles (success, error, or cancel).
//
// The default provider factory wires up a `LocalEngineProvider` over an
// `EngineScheduler` of `poolSize=1`. Tests inject their own factory via
// `startAnalysis(gameId, pgn, { providerFactory })`.
//
// Persistence: only `done` entries are persisted to localStorage under
// ANALYSIS_STORE_KEY. The `result.analysis` StateTree is stripped before
// serialization because it's a cyclic parent↔children graph that
// JSON.stringify can't handle. No UI reads that tree today; if a future
// consumer needs it, it'll have to re-run analyzeGame.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  analyzeGame,
  type AnalyzeGameResult,
} from '../services/analysis/analyzeGame'
import type { PositionProvider } from '../services/analysis/PositionProvider'
import { LocalEngineProvider } from '../services/analysis/LocalEngineProvider'
import { EngineScheduler } from '../services/engine/EngineScheduler'
import { UciEngine } from '../services/engine/UciEngine'
import { EngineVersion } from '../services/analysis/constants/EngineVersion'
import type { ChessGame } from '../services/chessComApi'

const DEFAULT_DEPTH = 16
const DEFAULT_MULTI_PV = 1
export const ANALYSIS_STORE_KEY = 'anti-blunder-club:analysis'

export type AnalysisEntry =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | {
      status: 'done'
      result: AnalyzeGameResult
      durationMs: number
      analysedAt: number
      /** Source game metadata — present when available so the "Analysed"
       *  tab can render a card without re-fetching. */
      game?: ChessGame
    }
  | { status: 'error'; error: string }

export interface StartAnalysisOptions {
  /** Override the provider factory (tests). */
  providerFactory?: () => PositionProvider
  /** ChessGame metadata, stored with the done entry for later listing. */
  game?: ChessGame
}

interface AnalysisState {
  byGameId: Record<string, AnalysisEntry>
  startAnalysis: (
    gameId: string,
    pgn: string,
    options?: StartAnalysisOptions,
  ) => Promise<void>
  cancelAnalysis: (gameId: string) => void
  reset: (gameId: string) => void
}

function defaultProviderFactory(): PositionProvider {
  const scheduler = new EngineScheduler({
    poolSize: 1,
    engineFactory: () =>
      new UciEngine({ version: EngineVersion.STOCKFISH_18_LITE }),
  })
  return new LocalEngineProvider(scheduler)
}

const controllers = new Map<string, AbortController>()

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      byGameId: {},

      startAnalysis: async (gameId, pgn, options) => {
        const existing = get().byGameId[gameId]
        if (
          existing &&
          (existing.status === 'running' || existing.status === 'done')
        ) {
          return
        }

        const controller = new AbortController()
        controllers.set(gameId, controller)

        set((state) => ({
          byGameId: {
            ...state.byGameId,
            [gameId]: { status: 'running', progress: 0 },
          },
        }))

        const factory = options?.providerFactory ?? defaultProviderFactory
        const provider = factory()
        const startedAt = Date.now()

        try {
          const result = await analyzeGame(pgn, provider, {
            depth: DEFAULT_DEPTH,
            multiPv: DEFAULT_MULTI_PV,
            signal: controller.signal,
            onProgress: (done, total) => {
              if (controller.signal.aborted) return
              set((state) => {
                const current = state.byGameId[gameId]
                if (!current || current.status !== 'running') return state
                return {
                  byGameId: {
                    ...state.byGameId,
                    [gameId]: {
                      status: 'running',
                      progress: total > 0 ? done / total : 0,
                    },
                  },
                }
              })
            },
          })

          if (controller.signal.aborted) return

          set((state) => ({
            byGameId: {
              ...state.byGameId,
              [gameId]: {
                status: 'done',
                result,
                durationMs: Date.now() - startedAt,
                analysedAt: Date.now(),
                game: options?.game,
              },
            },
          }))
        } catch (err) {
          const isAbort = err instanceof Error && err.name === 'AbortError'
          if (isAbort) {
            set((state) => {
              const next = { ...state.byGameId }
              delete next[gameId]
              return { byGameId: next }
            })
            return
          }
          const message = err instanceof Error ? err.message : String(err)
          set((state) => ({
            byGameId: {
              ...state.byGameId,
              [gameId]: { status: 'error', error: message },
            },
          }))
        } finally {
          controllers.delete(gameId)
          provider.dispose?.()
        }
      },

      cancelAnalysis: (gameId) => {
        const controller = controllers.get(gameId)
        if (controller) controller.abort()
      },

      reset: (gameId) => {
        set((state) => {
          const next = { ...state.byGameId }
          delete next[gameId]
          return { byGameId: next }
        })
      },
    }),
    {
      name: ANALYSIS_STORE_KEY,
      // Only keep done entries, and strip the cyclic `analysis` tree
      // before serialization. Live state is untouched.
      partialize: (state) => {
        const persistedByGameId: Record<string, AnalysisEntry> = {}
        for (const [id, entry] of Object.entries(state.byGameId)) {
          if (entry.status !== 'done') continue
          persistedByGameId[id] = {
            ...entry,
            result: {
              moves: entry.result.moves,
              accuracy: entry.result.accuracy,
              // `analysis` intentionally omitted — cyclic tree.
            } as AnalyzeGameResult,
          }
        }
        return { byGameId: persistedByGameId }
      },
    },
  ),
)
