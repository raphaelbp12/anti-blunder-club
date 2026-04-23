import type { ChessGame } from '../services/chessComApi'
import { normalizeResult, type NormalizedResult } from './resultNormalization'

/**
 * Returns the normalized result (`win` | `loss` | `draw` | `unknown`) for the
 * given player in `game`. Username match is case-insensitive.
 */
export function getPlayerResult(
  game: ChessGame,
  username: string,
): NormalizedResult {
  const lower = username.toLowerCase()
  if (game.white.username.toLowerCase() === lower) {
    return normalizeResult(game.white.result)
  }
  if (game.black.username.toLowerCase() === lower) {
    return normalizeResult(game.black.result)
  }
  return 'unknown'
}
