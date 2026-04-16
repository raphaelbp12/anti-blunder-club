import { usePlayerGamesStore } from '../usePlayerGamesStore'
import * as chessComApi from '../../services/chessComApi'

const mockGames: chessComApi.ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'hikaru', rating: 3200, result: 'win' },
    black: { username: 'opponent', rating: 3100, result: 'loss' },
    timeClass: 'bullet',
    endTime: 1711900000,
    accuracies: { white: 95.5, black: 88.2 },
  },
]

describe('usePlayerGamesStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    usePlayerGamesStore.setState({
      gamesByUsername: {},
      lastUsername: null,
      isLoading: false,
      error: null,
    })
  })

  it('has correct initial state', () => {
    const state = usePlayerGamesStore.getState()
    expect(state.gamesByUsername).toEqual({})
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetches and caches games for a username', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)

    await usePlayerGamesStore.getState().fetchGames('hikaru')

    const state = usePlayerGamesStore.getState()
    expect(state.gamesByUsername['hikaru']).toEqual(mockGames)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('sets loading state while fetching', async () => {
    let resolveGames!: (value: chessComApi.ChessGame[]) => void
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockImplementation(
      () => new Promise((resolve) => (resolveGames = resolve)),
    )

    const fetchPromise = usePlayerGamesStore.getState().fetchGames('hikaru')
    expect(usePlayerGamesStore.getState().isLoading).toBe(true)

    resolveGames(mockGames)
    await fetchPromise
    expect(usePlayerGamesStore.getState().isLoading).toBe(false)
  })

  it('sets error on fetch failure', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )

    await usePlayerGamesStore.getState().fetchGames('nobody')

    const state = usePlayerGamesStore.getState()
    expect(state.error).toBe('Player "nobody" not found')
    expect(state.isLoading).toBe(false)
  })

  it('sets lastUsername after a successful fetch', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)

    await usePlayerGamesStore.getState().fetchGames('hikaru')

    expect(usePlayerGamesStore.getState().lastUsername).toBe('hikaru')
  })

  it('updates lastUsername when fetching a different player', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)

    await usePlayerGamesStore.getState().fetchGames('hikaru')
    await usePlayerGamesStore.getState().fetchGames('magnus')

    expect(usePlayerGamesStore.getState().lastUsername).toBe('magnus')
  })

  it('sets lastUsername even when using cached data', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)

    await usePlayerGamesStore.getState().fetchGames('hikaru')
    usePlayerGamesStore.setState({ lastUsername: null })
    await usePlayerGamesStore.getState().fetchGames('hikaru')

    expect(usePlayerGamesStore.getState().lastUsername).toBe('hikaru')
  })

  it('does not set lastUsername on fetch failure', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player not found'),
    )

    await usePlayerGamesStore.getState().fetchGames('nobody')

    expect(usePlayerGamesStore.getState().lastUsername).toBeNull()
  })

  it('returns cached games without re-fetching', async () => {
    const fetchSpy = vi
      .spyOn(chessComApi, 'fetchPlayerGames')
      .mockResolvedValue(mockGames)

    await usePlayerGamesStore.getState().fetchGames('hikaru')
    await usePlayerGamesStore.getState().fetchGames('hikaru')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
