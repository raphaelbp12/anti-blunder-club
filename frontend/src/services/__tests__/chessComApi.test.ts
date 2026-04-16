import {
  fetchPlayerGames,
  fetchPlayerGame,
  extractGameId,
  fetchPlayerProfile,
  fetchPlayerStats,
  getHighestRating,
  type ChessGame,
  type PlayerStats,
} from '../chessComApi'

const ARCHIVES_URL = 'https://api.chess.com/pub/player/testuser/games/archives'
const GAMES_URL = 'https://api.chess.com/pub/player/testuser/games/2024/03'

const mockGame = {
  url: 'https://www.chess.com/game/live/123',
  white: { username: 'testuser', rating: 1500, result: 'win' },
  black: { username: 'opponent', rating: 1600, result: 'loss' },
  time_class: 'blitz',
  end_time: 1711900000,
  accuracies: { white: 95.5, black: 88.2 },
}

const mockGameWithoutAccuracies = {
  url: 'https://www.chess.com/game/live/124',
  white: { username: 'testuser', rating: 1500, result: 'win' },
  black: { username: 'opponent', rating: 1600, result: 'loss' },
  time_class: 'rapid',
  end_time: 1711900100,
}

describe('fetchPlayerGames', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches the archives list and then the most recent month', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) => {
        if (url === ARCHIVES_URL) {
          return Response.json({
            archives: [
              'https://api.chess.com/pub/player/testuser/games/2024/01',
              'https://api.chess.com/pub/player/testuser/games/2024/02',
              GAMES_URL,
            ],
          })
        }
        if (url === GAMES_URL) {
          return Response.json({ games: [mockGame] })
        }
        return Response.json({}, { status: 404 })
      })

    const games = await fetchPlayerGames('testuser')

    expect(fetchSpy).toHaveBeenCalledWith(ARCHIVES_URL)
    expect(fetchSpy).toHaveBeenCalledWith(GAMES_URL)
    expect(games).toHaveLength(1)
    expect(games[0]).toEqual<ChessGame>({
      url: 'https://www.chess.com/game/live/123',
      white: { username: 'testuser', rating: 1500, result: 'win' },
      black: { username: 'opponent', rating: 1600, result: 'loss' },
      timeClass: 'blitz',
      endTime: 1711900000,
      accuracies: { white: 95.5, black: 88.2 },
    })
  })

  it('maps accuracies as undefined when not present in API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === ARCHIVES_URL) {
        return Response.json({ archives: [GAMES_URL] })
      }
      if (url === GAMES_URL) {
        return Response.json({ games: [mockGameWithoutAccuracies] })
      }
      return Response.json({}, { status: 404 })
    })

    const games = await fetchPlayerGames('testuser')

    expect(games[0].accuracies).toBeUndefined()
  })

  it('throws when the player is not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    await expect(fetchPlayerGames('nonexistent')).rejects.toThrow(
      'Player "nonexistent" not found',
    )
  })

  it('throws when the archives list is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ archives: [] }),
    )

    await expect(fetchPlayerGames('testuser')).rejects.toThrow(
      'No game archives found',
    )
  })

  it('throws on network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )

    await expect(fetchPlayerGames('testuser')).rejects.toThrow(
      'Failed to fetch',
    )
  })
})

describe('extractGameId', () => {
  it('extracts the game ID from a chess.com live game URL', () => {
    expect(extractGameId('https://www.chess.com/game/live/12345678')).toBe(
      '12345678',
    )
  })

  it('extracts the game ID from a chess.com daily game URL', () => {
    expect(extractGameId('https://www.chess.com/game/daily/87654321')).toBe(
      '87654321',
    )
  })
})

describe('fetchPlayerGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches archives and returns the matching game', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === ARCHIVES_URL) {
        return Response.json({ archives: [GAMES_URL] })
      }
      if (url === GAMES_URL) {
        return Response.json({ games: [mockGame] })
      }
      return Response.json({}, { status: 404 })
    })

    const game = await fetchPlayerGame('testuser', '123')

    expect(game).toEqual<ChessGame>({
      url: 'https://www.chess.com/game/live/123',
      white: { username: 'testuser', rating: 1500, result: 'win' },
      black: { username: 'opponent', rating: 1600, result: 'loss' },
      timeClass: 'blitz',
      endTime: 1711900000,
      accuracies: { white: 95.5, black: 88.2 },
    })
  })

  it('throws when the game is not found in any archive', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === ARCHIVES_URL) {
        return Response.json({ archives: [GAMES_URL] })
      }
      if (url === GAMES_URL) {
        return Response.json({ games: [mockGame] })
      }
      return Response.json({}, { status: 404 })
    })

    await expect(fetchPlayerGame('testuser', '999')).rejects.toThrow(
      'Game not found',
    )
  })
})

describe('getHighestRating', () => {
  it('returns the highest rating across multiple time controls', () => {
    const stats: PlayerStats = {
      chess_rapid: { last: { rating: 1500 } },
      chess_blitz: { last: { rating: 1650 } },
      chess_bullet: { last: { rating: 1400 } },
    }
    expect(getHighestRating(stats)).toBe(1650)
  })

  it('returns the single rating when only one time control exists', () => {
    const stats: PlayerStats = {
      chess_blitz: { last: { rating: 1200 } },
    }
    expect(getHighestRating(stats)).toBe(1200)
  })

  it('returns null when no time controls have a last rating', () => {
    const stats: PlayerStats = {
      chess_rapid: {},
      chess_blitz: {},
    }
    expect(getHighestRating(stats)).toBeNull()
  })

  it('returns null for an empty stats object', () => {
    const stats: PlayerStats = {}
    expect(getHighestRating(stats)).toBeNull()
  })

  it('handles time controls where last is undefined', () => {
    const stats: PlayerStats = {
      chess_rapid: { last: undefined },
      chess_bullet: { last: { rating: 900 } },
    }
    expect(getHighestRating(stats)).toBe(900)
  })

  it('includes chess_daily in the computation', () => {
    const stats: PlayerStats = {
      chess_rapid: { last: { rating: 1000 } },
      chess_daily: { last: { rating: 1800 } },
    }
    expect(getHighestRating(stats)).toBe(1800)
  })
})

describe('fetchPlayerProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns profile with avatar when present', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        username: 'TestUser',
        avatar: 'https://images.chesscomfiles.com/uploads/avatar.png',
        player_id: 12345,
      }),
    )

    const profile = await fetchPlayerProfile('testuser')

    expect(profile).toEqual({
      username: 'TestUser',
      avatar: 'https://images.chesscomfiles.com/uploads/avatar.png',
    })
  })

  it('returns profile with undefined avatar when avatar field is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        username: 'TestUser',
        player_id: 12345,
      }),
    )

    const profile = await fetchPlayerProfile('testuser')

    expect(profile).toEqual({
      username: 'TestUser',
      avatar: undefined,
    })
  })

  it('throws when the player is not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    await expect(fetchPlayerProfile('nonexistent')).rejects.toThrow(
      'Player "nonexistent" not found',
    )
  })

  it('throws on network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )

    await expect(fetchPlayerProfile('testuser')).rejects.toThrow(
      'Failed to fetch',
    )
  })
})

describe('fetchPlayerStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns stats with all time controls', async () => {
    const mockStats = {
      chess_rapid: { last: { rating: 1500 } },
      chess_blitz: { last: { rating: 1600 } },
      chess_bullet: { last: { rating: 1400 } },
      chess_daily: { last: { rating: 1300 } },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(mockStats))

    const stats = await fetchPlayerStats('testuser')

    expect(stats).toEqual(mockStats)
  })

  it('returns stats with partial time controls', async () => {
    const mockStats = {
      chess_blitz: { last: { rating: 1600 } },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(mockStats))

    const stats = await fetchPlayerStats('testuser')

    expect(stats).toEqual(mockStats)
  })

  it('throws when stats are not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    await expect(fetchPlayerStats('nonexistent')).rejects.toThrow(
      'Stats for "nonexistent" not found',
    )
  })
})
