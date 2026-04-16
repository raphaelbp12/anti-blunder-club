import { useSearchHistoryStore } from '../useSearchHistoryStore'

describe('useSearchHistoryStore', () => {
  beforeEach(() => {
    useSearchHistoryStore.setState({ history: [] })
    localStorage.clear()
  })

  it('has an empty history initially', () => {
    expect(useSearchHistoryStore.getState().history).toEqual([])
  })

  it('adds a player to history', () => {
    useSearchHistoryStore.getState().addPlayer({
      username: 'hikaru',
      avatarUrl: 'https://example.com/avatar.png',
      highestRating: 3200,
    })

    expect(useSearchHistoryStore.getState().history).toEqual([
      {
        username: 'hikaru',
        avatarUrl: 'https://example.com/avatar.png',
        highestRating: 3200,
      },
    ])
  })

  it('prepends new entries (newest first)', () => {
    const { addPlayer } = useSearchHistoryStore.getState()

    addPlayer({ username: 'first', highestRating: 1000 })
    addPlayer({ username: 'second', highestRating: 2000 })

    const usernames = useSearchHistoryStore
      .getState()
      .history.map((e) => e.username)
    expect(usernames).toEqual(['second', 'first'])
  })

  it('replaces an existing entry with the same username (case-insensitive)', () => {
    const { addPlayer } = useSearchHistoryStore.getState()

    addPlayer({ username: 'Hikaru', highestRating: 3100 })
    addPlayer({ username: 'hikaru', highestRating: 3200 })

    const { history } = useSearchHistoryStore.getState()
    expect(history).toHaveLength(1)
    expect(history[0]).toEqual({
      username: 'hikaru',
      highestRating: 3200,
    })
  })

  it('moves replaced entry to the front', () => {
    const { addPlayer } = useSearchHistoryStore.getState()

    addPlayer({ username: 'player1', highestRating: 1000 })
    addPlayer({ username: 'player2', highestRating: 2000 })
    addPlayer({ username: 'player1', highestRating: 1100 })

    const usernames = useSearchHistoryStore
      .getState()
      .history.map((e) => e.username)
    expect(usernames).toEqual(['player1', 'player2'])
  })

  it('removes a player by username', () => {
    useSearchHistoryStore.setState({
      history: [
        { username: 'hikaru', highestRating: 3200 },
        { username: 'magnus', highestRating: 2800 },
      ],
    })

    useSearchHistoryStore.getState().removePlayer('hikaru')

    const { history } = useSearchHistoryStore.getState()
    expect(history).toEqual([{ username: 'magnus', highestRating: 2800 }])
  })

  it('removes a player case-insensitively', () => {
    useSearchHistoryStore.setState({
      history: [{ username: 'Hikaru', highestRating: 3200 }],
    })

    useSearchHistoryStore.getState().removePlayer('hikaru')

    expect(useSearchHistoryStore.getState().history).toEqual([])
  })

  it('is a no-op when removing a username not in history', () => {
    useSearchHistoryStore.setState({
      history: [{ username: 'hikaru', highestRating: 3200 }],
    })

    useSearchHistoryStore.getState().removePlayer('nobody')

    expect(useSearchHistoryStore.getState().history).toHaveLength(1)
  })
})
