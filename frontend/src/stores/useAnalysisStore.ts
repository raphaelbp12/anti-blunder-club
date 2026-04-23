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
// ANALYSIS_STORE_KEY. The persisted shape is deliberately slim:
// `summary` (per-colour classification counts) + `accuracy` + game
// metadata with PGN stripped. The full `result` (moves[] and the
// cyclic StateTree) is session-only — after a reload the user can
// re-analyse the game on demand if they want the per-move details.

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
import {
  summarizeClassifications,
  type ClassificationSummary,
} from '../services/analysis/summarizeClassifications'
import type { ChessGame } from '../services/chessComApi'

const DEFAULT_DEPTH = 16
const DEFAULT_MULTI_PV = 1
export const ANALYSIS_STORE_KEY = 'anti-blunder-club:analysis'

export type AnalysisEntry =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | {
      status: 'done'
      /** Per-colour classification counts. Always present (persisted). */
      summary: ClassificationSummary
      /** Per-colour game accuracy. Always present (persisted). */
      accuracy: { white: number; black: number }
      durationMs: number
      analysedAt: number
      /** Source game metadata — persisted with PGN stripped. */
      game?: ChessGame
      /** Full analysis result. Session-only; absent after reload. */
      result?: AnalyzeGameResult
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
        // Allow re-running a done entry whose full result has been
        // dropped at persistence boundary (hydrated on reload).
        if (existing) {
          if (existing.status === 'running') return
          if (existing.status === 'done' && existing.result) return
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
                summary: summarizeClassifications(result.moves),
                accuracy: result.accuracy,
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
      // Bump when the persisted shape of AnalysisEntry changes. v1 was
      // the initial release that persisted the full `result`. v2 persists
      // summary + accuracy at the top level; `result` is session-only.
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        // Any pre-v2 payload is discarded: the old shape stored `result`
        // but not top-level `summary`/`accuracy`, so there's nothing
        // useful to recover without re-running the engine.
        if (version < 2) return { byGameId: {} }
        return persisted as { byGameId: Record<string, AnalysisEntry> }
      },
      // Defensive: on load, drop any done entry missing summary/accuracy
      // (e.g. a manually-edited localStorage or a partial write).
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const cleaned: Record<string, AnalysisEntry> = {}
        for (const [id, entry] of Object.entries(state.byGameId)) {
          if (entry.status === 'done' && (!entry.summary || !entry.accuracy)) {
            continue
          }
          cleaned[id] = entry
        }
        state.byGameId = cleaned
      },
      // Only keep done entries, and strip the heavy / cyclic bits of the
      // result plus the PGN. Live state is untouched.
      partialize: (state) => {
        const persistedByGameId: Record<string, AnalysisEntry> = {}
        for (const [id, entry] of Object.entries(state.byGameId)) {
          if (entry.status !== 'done') continue
          const gameWithoutPgn = entry.game
            ? (() => {
                const rest = { ...entry.game }
                delete rest.pgn
                return rest as ChessGame
              })()
            : undefined
          persistedByGameId[id] = {
            status: 'done',
            summary: entry.summary,
            accuracy: entry.accuracy,
            durationMs: entry.durationMs,
            analysedAt: entry.analysedAt,
            game: gameWithoutPgn,
            // `result` intentionally omitted — session-only.
          }
        }
        return { byGameId: persistedByGameId }
      },
    },
  ),
)
