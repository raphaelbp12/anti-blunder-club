// SPDX-License-Identifier: GPL-3.0-or-later
//
// DIP seam between the analyzer and its source of engine evaluations.
// `analyzeGame` depends on this interface only, so callers can plug in a
// local Stockfish worker (LocalEngineProvider), a cloud API
// (LichessCloudProvider, later), or a test fake.

import type { EngineLine } from './types/EngineLine'

export interface PositionProvider {
  /** Evaluate a FEN and return the engine's top `multiPv` lines. */
  evaluate(
    fen: string,
    options: { depth: number; multiPv: number },
  ): Promise<EngineLine[]>

  /** Release any resources held by the provider (workers, sockets, ...). */
  dispose?(): void
}
