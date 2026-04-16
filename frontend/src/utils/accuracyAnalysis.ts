import type { ChessGame } from '../services/chessComApi'

export interface GameAccuracy {
  game: ChessGame
  accuracy: number
}

export interface AccuracyAnalysis {
  meanAccuracy: number
  gamesAnalyzed: number
  gamesBelowAverage: GameAccuracy[]
}

export function getPlayerAccuracy(
  game: ChessGame,
  username: string,
): number | null {
  if (!game.accuracies) return null

  const lower = username.toLowerCase()

  if (game.white.username.toLowerCase() === lower) {
    return game.accuracies.white
  }

  if (game.black.username.toLowerCase() === lower) {
    return game.accuracies.black
  }

  return null
}

export function analyzeAccuracy(
  games: ChessGame[],
  username: string,
): AccuracyAnalysis {
  const withAccuracy: GameAccuracy[] = []

  for (const game of games) {
    const accuracy = getPlayerAccuracy(game, username)
    if (accuracy !== null) {
      withAccuracy.push({ game, accuracy })
    }
  }

  if (withAccuracy.length === 0) {
    return { meanAccuracy: 0, gamesAnalyzed: 0, gamesBelowAverage: [] }
  }

  const sum = withAccuracy.reduce((acc, ga) => acc + ga.accuracy, 0)
  const meanAccuracy = sum / withAccuracy.length

  const gamesBelowAverage = withAccuracy
    .filter((ga) => ga.accuracy < meanAccuracy)
    .sort((a, b) => a.accuracy - b.accuracy)

  return {
    meanAccuracy,
    gamesAnalyzed: withAccuracy.length,
    gamesBelowAverage,
  }
}
