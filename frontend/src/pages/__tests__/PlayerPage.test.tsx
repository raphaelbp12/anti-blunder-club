import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PlayerPage } from '../PlayerPage'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import { useSearchHistoryStore } from '../../stores/useSearchHistoryStore'
import { trackEvent } from '../../utils/analytics'
import * as chessComApi from '../../services/chessComApi'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

// Use recent timestamps so games fall within the default "Last 3 months"
// date filter window. Exact values don't matter — only relative recency.
const NOW_SEC = Math.floor(Date.now() / 1000)

const mockGames: chessComApi.ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'hikaru', rating: 3200, result: 'win' },
    black: { username: 'opponent', rating: 3100, result: 'loss' },
    timeClass: 'bullet',
    endTime: NOW_SEC - 120,
    accuracies: { white: 90.0, black: 75.0 },
  },
  {
    url: 'https://www.chess.com/game/live/222',
    white: { username: 'hikaru', rating: 3200, result: 'loss' },
    black: { username: 'rival', rating: 3300, result: 'win' },
    timeClass: 'blitz',
    endTime: NOW_SEC - 60,
    accuracies: { white: 70.0, black: 85.0 },
  },
]

function renderPlayerPage(username = 'hikaru', search = '') {
  return render(
    <MemoryRouter initialEntries={[`/player/${username}${search}`]}>
      <Routes>
        <Route path="/player/:username" element={<PlayerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlayerPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    usePlayerGamesStore.setState({
      gamesByUsername: {},
      isLoading: false,
      error: null,
    })
    useSearchHistoryStore.setState({ history: [] })
  })

  it('shows the Accuracy tab by default', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByText(/80\.0/)).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: 'Accuracy' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('switches to the Games tab when clicked', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Games' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Games' }))

    expect(screen.getByText(/opponent/)).toBeInTheDocument()
    expect(screen.getByText(/rival/)).toBeInTheDocument()
  })

  it('renders the Games tab when ?tab=games is in the URL', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage('hikaru', '?tab=games')

    await waitFor(() => {
      expect(screen.getByText(/opponent/)).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: 'Games' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('fires tab_switched event when switching tabs', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Games' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Games' }))

    expect(trackEvent).toHaveBeenCalledWith('tab_switched', {
      tab_name: 'games',
      from_tab: 'accuracy',
    })
  })

  it('filters accuracy analysis by time class', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage()

    // Default: both games, mean = (90 + 70) / 2 = 80
    await waitFor(() => {
      expect(screen.getByText(/80\.0/)).toBeInTheDocument()
      expect(screen.getByText(/2 games analyzed/i)).toBeInTheDocument()
    })

    // Filter to bullet only: 1 game with 90% accuracy
    await user.click(screen.getByRole('button', { name: 'Bullet' }))

    expect(screen.getByText(/90\.0/)).toBeInTheDocument()
    expect(screen.getByText(/1 games analyzed/i)).toBeInTheDocument()
  })

  it('filters games list by time class', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage('hikaru', '?tab=games')

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'Blitz' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/rival/)).toBeInTheDocument()
  })

  it('persists filter across tab switches', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage()

    // Filter to bullet on accuracy tab
    await waitFor(() => {
      expect(screen.getByText(/2 games analyzed/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Bullet' }))
    expect(screen.getByText(/1 games analyzed/i)).toBeInTheDocument()

    // Switch to games tab — filter should still be bullet
    await user.click(screen.getByRole('tab', { name: 'Games' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/opponent/)).toBeInTheDocument()
  })

  it('defaults the date filter to "Last 3 months"', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByText(/2 games analyzed/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Last 3 months' })).toHaveClass(
      'bg-accent',
    )
  })

  it('filters out games older than the selected date preset', async () => {
    // One recent game + one ancient game (well outside any preset).
    const gamesWithAncient: chessComApi.ChessGame[] = [
      mockGames[0],
      {
        ...mockGames[1],
        url: 'https://www.chess.com/game/live/333',
        endTime: NOW_SEC - 365 * 24 * 60 * 60, // one year ago
      },
    ]
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(
      gamesWithAncient,
    )
    renderPlayerPage('hikaru', '?tab=games')

    // Default "Last 3 months" should include only the recent game.
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    })
    expect(screen.getByText(/opponent/)).toBeInTheDocument()
  })

  it('narrows the accuracy analysis when switching to "Today"', async () => {
    // Put the second game far enough back that "Today" excludes it but
    // "Last 3 months" (the default) includes it.
    const games: chessComApi.ChessGame[] = [
      mockGames[0], // very recent — within "Today"
      {
        ...mockGames[1],
        endTime: NOW_SEC - 3 * 24 * 60 * 60, // 3 days ago
      },
    ]
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(games)
    const user = userEvent.setup()
    renderPlayerPage()

    // Default: both games → mean = (90 + 70) / 2 = 80
    await waitFor(() => {
      expect(screen.getByText(/80\.0/)).toBeInTheDocument()
      expect(screen.getByText(/2 games analyzed/i)).toBeInTheDocument()
    })

    // Switch to "Today" → only the very recent 90% game remains.
    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(screen.getByText(/90\.0/)).toBeInTheDocument()
    expect(screen.getByText(/1 games analyzed/i)).toBeInTheDocument()
  })

  it('tracks game_filter_applied with filter_name on date filter change', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByText(/2 games analyzed/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(trackEvent).toHaveBeenCalledWith('game_filter_applied', {
      filter_name: 'date',
      filter_value: 'today',
    })
  })

  it('shows loading state while fetching', () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockImplementation(
      () => new Promise(() => {}),
    )
    usePlayerGamesStore.setState({ isLoading: true })
    renderPlayerPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )
    renderPlayerPage('nobody')

    await waitFor(() => {
      expect(screen.getByText(/Player "nobody" not found/)).toBeInTheDocument()
    })
  })

  it('adds player to search history after games load', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    vi.spyOn(chessComApi, 'fetchPlayerProfile').mockResolvedValue({
      username: 'hikaru',
      avatar: 'https://example.com/avatar.png',
    })
    vi.spyOn(chessComApi, 'fetchPlayerStats').mockResolvedValue({
      chess_bullet: { last: { rating: 3200 } },
      chess_blitz: { last: { rating: 3100 } },
    })

    renderPlayerPage('hikaru')

    await waitFor(() => {
      const { history } = useSearchHistoryStore.getState()
      expect(history).toEqual([
        {
          username: 'hikaru',
          avatarUrl: 'https://example.com/avatar.png',
          highestRating: 3200,
        },
      ])
    })
  })

  it('adds player with null rating when profile/stats fetch fails', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    vi.spyOn(chessComApi, 'fetchPlayerProfile').mockRejectedValue(
      new Error('Not found'),
    )
    vi.spyOn(chessComApi, 'fetchPlayerStats').mockRejectedValue(
      new Error('Not found'),
    )

    renderPlayerPage('hikaru')

    await waitFor(() => {
      const { history } = useSearchHistoryStore.getState()
      expect(history).toEqual([
        {
          username: 'hikaru',
          highestRating: null,
        },
      ])
    })
  })

  it('does not add player to history when game fetch errors', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )
    vi.spyOn(chessComApi, 'fetchPlayerProfile').mockResolvedValue({
      username: 'nobody',
    })
    vi.spyOn(chessComApi, 'fetchPlayerStats').mockResolvedValue({})

    renderPlayerPage('nobody')

    await waitFor(() => {
      expect(screen.getByText(/Player "nobody" not found/)).toBeInTheDocument()
    })

    expect(useSearchHistoryStore.getState().history).toEqual([])
  })

  it('fires player_search_result with success after games load', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    vi.spyOn(chessComApi, 'fetchPlayerProfile').mockResolvedValue({
      username: 'hikaru',
    })
    vi.spyOn(chessComApi, 'fetchPlayerStats').mockResolvedValue({})

    renderPlayerPage('hikaru')

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('player_search_result', {
        username: 'hikaru',
        result: 'success',
        game_count: 2,
      })
    })
  })

  it('fires player_search_result with error on fetch failure', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )

    renderPlayerPage('nobody')

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('player_search_result', {
        username: 'nobody',
        result: 'error',
        game_count: 0,
      })
    })
  })
})
