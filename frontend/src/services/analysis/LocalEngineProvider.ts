// SPDX-License-Identifier: GPL-3.0-or-later
//
// PositionProvider backed by a local `EngineScheduler` (Stockfish in a
// Web Worker). Thin adapter: forwards `evaluate` and `dispose`.

import type { PositionProvider } from './PositionProvider'
import type { EngineScheduler } from '../engine/EngineScheduler'

export class LocalEngineProvider implements PositionProvider {
  private readonly scheduler: EngineScheduler

  constructor(scheduler: EngineScheduler) {
    this.scheduler = scheduler
  }

  evaluate(fen: string, options: { depth: number; multiPv: number }) {
    return this.scheduler.evaluate(fen, options)
  }

  dispose(): void {
    this.scheduler.dispose()
  }
}

export default LocalEngineProvider
