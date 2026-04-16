import type { ChessGame } from '../../services/chessComApi'
import { getPlayerAccuracy, analyzeAccuracy } from '../accuracyAnalysis'

const gameWithAccuracies: ChessGame = {
  url: 'https://www.chess.com/game/live/111',
  white: { username: 'Alice', rating: 1500, result: 'win' },
  black: { username: 'Bob', rating: 1400, result: 'loss' },
  timeClass: 'blitz',
  endTime: 1711900000,
  accuracies: { white: 90.0, black: 75.0 },
}

const gameNoAccuracies: ChessGame = {
  url: 'https://www.chess.com/game/live/222',
  white: { username: 'Alice', rating: 1510, result: 'loss' },
  black: { username: 'Charlie', rating: 1600, result: 'win' },
  timeClass: 'rapid',
  endTime: 1711900100,
}

const gameAliceBlack: ChessGame = {
  url: 'https://www.chess.com/game/live/333',
  white: { username: 'Dan', rating: 1450, result: 'loss' },
  black: { username: 'Alice', rating: 1520, result: 'win' },
  timeClass: 'bullet',
  endTime: 1711900200,
  accuracies: { white: 60.0, black: 80.0 },
}

describe('getPlayerAccuracy', () => {
  it('returns white accuracy when username matches white player', () => {
    expect(getPlayerAccuracy(gameWithAccuracies, 'Alice')).toBe(90.0)
  })

  it('returns black accuracy when username matches black player', () => {
    expect(getPlayerAccuracy(gameAliceBlack, 'Alice')).toBe(80.0)
  })

  it('matches username case-insensitively', () => {
    expect(getPlayerAccuracy(gameWithAccuracies, 'alice')).toBe(90.0)
    expect(getPlayerAccuracy(gameAliceBlack, 'ALICE')).toBe(80.0)
  })

  it('returns null when game has no accuracies', () => {
    expect(getPlayerAccuracy(gameNoAccuracies, 'Alice')).toBeNull()
  })

  it('returns null when username does not match either player', () => {
    expect(getPlayerAccuracy(gameWithAccuracies, 'Unknown')).toBeNull()
  })
})

describe('analyzeAccuracy', () => {
  it('computes the correct mean from games with accuracy data', () => {
    const games = [gameWithAccuracies, gameAliceBlack]
    const result = analyzeAccuracy(games, 'Alice')
    // (90 + 80) / 2 = 85
    expect(result.meanAccuracy).toBe(85)
    expect(result.gamesAnalyzed).toBe(2)
  })

  it('excludes games without accuracy data from the mean', () => {
    const games = [gameWithAccuracies, gameNoAccuracies, gameAliceBlack]
    const result = analyzeAccuracy(games, 'Alice')
    // Only gameWithAccuracies (90) and gameAliceBlack (80) count
    expect(result.meanAccuracy).toBe(85)
    expect(result.gamesAnalyzed).toBe(2)
  })

  it('returns gamesBelowAverage sorted by accuracy ascending', () => {
    const game70: ChessGame = {
      url: 'https://www.chess.com/game/live/444',
      white: { username: 'Alice', rating: 1500, result: 'loss' },
      black: { username: 'Eve', rating: 1700, result: 'win' },
      timeClass: 'blitz',
      endTime: 1711900300,
      accuracies: { white: 70.0, black: 95.0 },
    }
    const game60: ChessGame = {
      url: 'https://www.chess.com/game/live/555',
      white: { username: 'Alice', rating: 1500, result: 'loss' },
      black: { username: 'Frank', rating: 1800, result: 'win' },
      timeClass: 'blitz',
      endTime: 1711900400,
      accuracies: { white: 60.0, black: 92.0 },
    }
    // Games: 90, 80, 70, 60 → mean = 75
    // Below average: 70 and 60, sorted ascending → [60, 70]
    const games = [gameWithAccuracies, gameAliceBlack, game70, game60]
    const result = analyzeAccuracy(games, 'Alice')

    expect(result.meanAccuracy).toBe(75)
    expect(result.gamesBelowAverage).toHaveLength(2)
    expect(result.gamesBelowAverage[0].accuracy).toBe(60)
    expect(result.gamesBelowAverage[0].game).toBe(game60)
    expect(result.gamesBelowAverage[1].accuracy).toBe(70)
    expect(result.gamesBelowAverage[1].game).toBe(game70)
  })

  it('does not include games exactly at the mean', () => {
    const gameAt85: ChessGame = {
      url: 'https://www.chess.com/game/live/666',
      white: { username: 'Alice', rating: 1500, result: 'win' },
      black: { username: 'Grace', rating: 1500, result: 'loss' },
      timeClass: 'rapid',
      endTime: 1711900500,
      accuracies: { white: 85.0, black: 80.0 },
    }
    // Games: 90, 80, 85 → mean = 85
    // Below average (strictly < 85): only 80
    const games = [gameWithAccuracies, gameAliceBlack, gameAt85]
    const result = analyzeAccuracy(games, 'Alice')

    expect(result.meanAccuracy).toBe(85)
    expect(result.gamesBelowAverage).toHaveLength(1)
    expect(result.gamesBelowAverage[0].accuracy).toBe(80)
  })

  it('returns empty analysis when games array is empty', () => {
    const result = analyzeAccuracy([], 'Alice')
    expect(result.meanAccuracy).toBe(0)
    expect(result.gamesAnalyzed).toBe(0)
    expect(result.gamesBelowAverage).toEqual([])
  })

  it('returns empty analysis when all games lack accuracy data', () => {
    const result = analyzeAccuracy([gameNoAccuracies], 'Alice')
    expect(result.meanAccuracy).toBe(0)
    expect(result.gamesAnalyzed).toBe(0)
    expect(result.gamesBelowAverage).toEqual([])
  })

  it('returns empty gamesBelowAverage when there is only one game', () => {
    const result = analyzeAccuracy([gameWithAccuracies], 'Alice')
    expect(result.meanAccuracy).toBe(90)
    expect(result.gamesAnalyzed).toBe(1)
    expect(result.gamesBelowAverage).toEqual([])
  })
})
