import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PlayerPage } from '../PlayerPage'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import { useSearchHistoryStore } from '../../stores/useSearchHistoryStore'
import { trackEvent } from '../../utils/analytics'
import * as chessComApi from '../../services/chessComApi'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}))

const mockGames: chessComApi.ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'hikaru', rating: 3200, result: 'win' },
    black: { username: 'opponent', rating: 3100, result: 'loss' },
    timeClass: 'bullet',
    endTime: 1711900000,
  },
]

function renderPlayerPage(username = 'hikaru') {
  return render(
    <MemoryRouter initialEntries={[`/player/${username}`]}>
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

  it('renders the username in the heading', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /hikaru/i }),
      ).toBeInTheDocument()
    })
  })

  it('fetches and displays games from the store', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByText(/opponent/)).toBeInTheDocument()
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
        game_count: 1,
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
