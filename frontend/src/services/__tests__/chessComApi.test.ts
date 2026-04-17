import {
  fetchPlayerGames,
  fetchPlayerGame,
  extractGameId,
  fetchPlayerProfile,
  fetchPlayerStats,
  getHighestRating,
  parseEcoCode,
  parseTermination,
  parseOpeningName,
  type ChessGame,
  type PlayerStats,
} from '../chessComApi'

const ARCHIVES_URL = 'https://api.chess.com/pub/player/testuser/games/archives'
const GAMES_URL = 'https://api.chess.com/pub/player/testuser/games/2024/03'

const mockPgn = `[Event "Live Chess"]
[ECO "B06"]
[ECOUrl "https://www.chess.com/openings/Modern-Defense-with-1-e4"]
[Termination "testuser won by resignation"]

1. e4 g6 0-1`

const mockGame = {
  url: 'https://www.chess.com/game/live/123',
  white: { username: 'testuser', rating: 1500, result: 'win' },
  black: { username: 'opponent', rating: 1600, result: 'loss' },
  time_class: 'blitz',
  end_time: 1711900000,
  accuracies: { white: 95.5, black: 88.2 },
  pgn: mockPgn,
  eco: 'https://www.chess.com/openings/Modern-Defense-with-1-e4',
  rules: 'chess',
  rated: true,
  time_control: '180',
}

const mockGameWithoutAccuracies = {
  url: 'https://www.chess.com/game/live/124',
  white: { username: 'testuser', rating: 1500, result: 'win' },
  black: { username: 'opponent', rating: 1600, result: 'loss' },
  time_class: 'rapid',
  end_time: 1711900100,
  pgn: '[ECO "C50"]\n[Termination "testuser won on time"]\n\n1. e4 e5',
  eco: 'https://www.chess.com/openings/Italian-Game',
  rules: 'chess',
  rated: true,
  time_control: '600',
}

const GAMES_URL_JAN = 'https://api.chess.com/pub/player/testuser/games/2024/01'
const GAMES_URL_FEB = 'https://api.chess.com/pub/player/testuser/games/2024/02'

const mockGameJan = {
  ...mockGame,
  url: 'https://www.chess.com/game/live/100',
  end_time: 1706700000,
}

const mockGameFeb = {
  ...mockGame,
  url: 'https://www.chess.com/game/live/200',
  end_time: 1709200000,
}

const mockBughouseGame = {
  ...mockGame,
  url: 'https://www.chess.com/game/live/999',
  end_time: 1711900500,
  rules: 'bughouse',
}

describe('fetchPlayerGames', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches the last 3 archives and combines games sorted by endTime descending', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) => {
        if (url === ARCHIVES_URL) {
          return Response.json({
            archives: [GAMES_URL_JAN, GAMES_URL_FEB, GAMES_URL],
          })
        }
        if (url === GAMES_URL_JAN) {
          return Response.json({ games: [mockGameJan] })
        }
        if (url === GAMES_URL_FEB) {
          return Response.json({ games: [mockGameFeb] })
        }
        if (url === GAMES_URL) {
          return Response.json({ games: [mockGame] })
        }
        return Response.json({}, { status: 404 })
      })

    const games = await fetchPlayerGames('testuser')

    expect(fetchSpy).toHaveBeenCalledWith(ARCHIVES_URL)
    expect(fetchSpy).toHaveBeenCalledWith(GAMES_URL_JAN)
    expect(fetchSpy).toHaveBeenCalledWith(GAMES_URL_FEB)
    expect(fetchSpy).toHaveBeenCalledWith(GAMES_URL)
    expect(games).toHaveLength(3)
    expect(games[0].endTime).toBe(1711900000)
    expect(games[1].endTime).toBe(1709200000)
    expect(games[2].endTime).toBe(1706700000)
  })

  it('fetches only available archives when fewer than 3 exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === ARCHIVES_URL) {
        return Response.json({ archives: [GAMES_URL] })
      }
      if (url === GAMES_URL) {
        return Response.json({ games: [mockGame] })
      }
      return Response.json({}, { status: 404 })
    })

    const games = await fetchPlayerGames('testuser')

    expect(games).toHaveLength(1)
    expect(games[0]).toEqual<ChessGame>({
      url: 'https://www.chess.com/game/live/123',
      white: { username: 'testuser', rating: 1500, result: 'win' },
      black: { username: 'opponent', rating: 1600, result: 'loss' },
      timeClass: 'blitz',
      endTime: 1711900000,
      accuracies: { white: 95.5, black: 88.2 },
      eco: 'B06',
      openingUrl: 'https://www.chess.com/openings/Modern-Defense-with-1-e4',
      openingName: 'Modern Defense with 1 e4',
      termination: 'testuser won by resignation',
      rules: 'chess',
      rated: true,
      timeControl: '180',
    })
  })

  it('fetches at most 3 archives even when more exist', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) => {
        if (url === ARCHIVES_URL) {
          return Response.json({
            archives: [
              'https://api.chess.com/pub/player/testuser/games/2023/10',
              'https://api.chess.com/pub/player/testuser/games/2023/11',
              'https://api.chess.com/pub/player/testuser/games/2023/12',
              GAMES_URL_JAN,
              GAMES_URL_FEB,
              GAMES_URL,
            ],
          })
        }
        if (url === GAMES_URL_JAN) {
          return Response.json({ games: [mockGameJan] })
        }
        if (url === GAMES_URL_FEB) {
          return Response.json({ games: [mockGameFeb] })
        }
        if (url === GAMES_URL) {
          return Response.json({ games: [mockGame] })
        }
        return Response.json({}, { status: 404 })
      })

    const games = await fetchPlayerGames('testuser')

    expect(games).toHaveLength(3)
    // Should NOT have fetched older archives
    expect(fetchSpy).not.toHaveBeenCalledWith(
      'https://api.chess.com/pub/player/testuser/games/2023/10',
    )
  })

  it('filters out non-chess games (bughouse, chess960, etc.)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === ARCHIVES_URL) {
        return Response.json({ archives: [GAMES_URL] })
      }
      if (url === GAMES_URL) {
        return Response.json({
          games: [mockGame, mockBughouseGame],
        })
      }
      return Response.json({}, { status: 404 })
    })

    const games = await fetchPlayerGames('testuser')

    expect(games).toHaveLength(1)
    expect(games[0].url).toBe('https://www.chess.com/game/live/123')
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
      eco: 'B06',
      openingUrl: 'https://www.chess.com/openings/Modern-Defense-with-1-e4',
      openingName: 'Modern Defense with 1 e4',
      termination: 'testuser won by resignation',
      rules: 'chess',
      rated: true,
      timeControl: '180',
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

describe('parseEcoCode', () => {
  it('extracts ECO code from a standard PGN', () => {
    expect(parseEcoCode('[ECO "B06"]\n[Site "Chess.com"]')).toBe('B06')
  })

  it('extracts ECO code when surrounded by other headers', () => {
    const pgn = '[Event "Live Chess"]\n[ECO "C50"]\n[Termination "win"]'
    expect(parseEcoCode(pgn)).toBe('C50')
  })

  it('returns undefined when PGN has no ECO header', () => {
    expect(parseEcoCode('[Event "Live Chess"]\n1. e4 e5')).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(parseEcoCode(undefined)).toBeUndefined()
  })
})

describe('parseTermination', () => {
  it('extracts termination from PGN', () => {
    expect(
      parseTermination('[Termination "testuser won by resignation"]'),
    ).toBe('testuser won by resignation')
  })

  it('handles termination with special characters', () => {
    expect(parseTermination('[Termination "Game drawn by agreement"]')).toBe(
      'Game drawn by agreement',
    )
  })

  it('returns undefined when PGN has no Termination header', () => {
    expect(parseTermination('[ECO "B06"]\n1. e4 e5')).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(parseTermination(undefined)).toBeUndefined()
  })
})

describe('parseOpeningName', () => {
  it('extracts opening name from a Chess.com opening URL', () => {
    expect(
      parseOpeningName(
        'https://www.chess.com/openings/Modern-Defense-with-1-e4',
      ),
    ).toBe('Modern Defense with 1 e4')
  })

  it('handles openings with variation separators (...)', () => {
    expect(
      parseOpeningName(
        'https://www.chess.com/openings/Sicilian-Defense-Kan-Maroczy-Bind-Formation...6.Nc3-Qc7',
      ),
    ).toBe('Sicilian Defense Kan Maroczy Bind Formation')
  })

  it('returns undefined for undefined input', () => {
    expect(parseOpeningName(undefined)).toBeUndefined()
  })

  it('returns undefined for URLs without /openings/ path', () => {
    expect(
      parseOpeningName('https://www.chess.com/game/live/123'),
    ).toBeUndefined()
  })
})
