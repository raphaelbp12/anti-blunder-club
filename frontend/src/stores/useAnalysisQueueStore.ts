// SPDX-License-Identifier: GPL-3.0-or-later
//
// useAnalysisQueueStore — FIFO queue of analyses to run, with bounded
// concurrency. Sits on top of `useAnalysisStore`: each dequeued item
// calls `useAnalysisStore.startAnalysis(...)` and the queue observes
// the result via the returned promise.
//
// Responsibilities:
//   - Track pending items and currently-running gameIds.
//   - Expose batchTotal / batchDone counters for a progress bar. Both
//     reset to 0 once the queue drains completely.
//   - Skip enqueuing when the same gameId is already pending, running,
//     or already done-with-result (nothing to do).
//   - Cancel individual items or the whole batch.
//
// Concurrency defaults to 1 (serial). Bumping it spawns extra concurrent
// `startAnalysis` calls; each uses its own `PositionProvider`, so there
// is no shared engine state to worry about.

import { create } from 'zustand'

import type { PositionProvider } from '../services/analysis/PositionProvider'
import type { ChessGame } from '../services/chessComApi'
import { useAnalysisStore } from './useAnalysisStore'

export const ANALYSIS_QUEUE_DEFAULT_CONCURRENCY = 1

export interface QueueItem {
  gameId: string
  pgn: string
  game: ChessGame
  /** Test-only: inject a deterministic provider factory. */
  providerFactory?: () => PositionProvider
}

interface QueueState {
  pending: QueueItem[]
  running: string[]
  concurrency: number
  /** Total items accepted into the current batch (excludes no-ops). */
  batchTotal: number
  /** Items that have settled (done / error / cancelled) in the batch. */
  batchDone: number
  enqueue: (item: QueueItem) => void
  cancel: (gameId: string) => void
  cancelAll: () => void
  isActive: (gameId: string) => boolean
  setConcurrency: (n: number) => void
}

export const useAnalysisQueueStore = create<QueueState>((set, get) => ({
  pending: [],
  running: [],
  concurrency: ANALYSIS_QUEUE_DEFAULT_CONCURRENCY,
  batchTotal: 0,
  batchDone: 0,

  enqueue: (item) => {
    const { pending, running } = get()
    if (running.includes(item.gameId)) return
    if (pending.some((p) => p.gameId === item.gameId)) return

    const analysisEntry = useAnalysisStore.getState().byGameId[item.gameId]
    // Skip if a session-complete analysis already exists. A persisted-only
    // done entry (result absent) is re-runnable, so we do NOT skip it.
    if (
      analysisEntry?.status === 'done' &&
      analysisEntry.result !== undefined
    ) {
      return
    }
    if (analysisEntry?.status === 'running') return

    set((s) => ({
      pending: [...s.pending, item],
      batchTotal: s.batchTotal + 1,
    }))
    drain()
  },

  cancel: (gameId) => {
    const wasPending = get().pending.some((p) => p.gameId === gameId)
    set((s) => ({
      pending: s.pending.filter((p) => p.gameId !== gameId),
      batchDone: wasPending ? s.batchDone + 1 : s.batchDone,
    }))
    if (get().running.includes(gameId)) {
      useAnalysisStore.getState().cancelAnalysis(gameId)
    }
    maybeResetCounters()
  },

  cancelAll: () => {
    const { pending, running } = get()
    set((s) => ({
      pending: [],
      batchDone: s.batchDone + pending.length,
    }))
    for (const gameId of running) {
      useAnalysisStore.getState().cancelAnalysis(gameId)
    }
    maybeResetCounters()
  },

  isActive: (gameId) => {
    const { pending, running } = get()
    return running.includes(gameId) || pending.some((p) => p.gameId === gameId)
  },

  setConcurrency: (n) => {
    set({ concurrency: Math.max(1, n) })
    drain()
  },
}))

function drain() {
  while (true) {
    const { pending, running, concurrency } = useAnalysisQueueStore.getState()
    if (running.length >= concurrency) return
    if (pending.length === 0) return

    const next = pending[0]
    useAnalysisQueueStore.setState({
      pending: pending.slice(1),
      running: [...running, next.gameId],
    })

    void useAnalysisStore
      .getState()
      .startAnalysis(next.gameId, next.pgn, {
        game: next.game,
        providerFactory: next.providerFactory,
      })
      .finally(() => {
        useAnalysisQueueStore.setState((s) => ({
          running: s.running.filter((g) => g !== next.gameId),
          batchDone: s.batchDone + 1,
        }))
        maybeResetCounters()
        drain()
      })
  }
}

function maybeResetCounters() {
  const { pending, running } = useAnalysisQueueStore.getState()
  if (pending.length === 0 && running.length === 0) {
    useAnalysisQueueStore.setState({ batchTotal: 0, batchDone: 0 })
  }
}
