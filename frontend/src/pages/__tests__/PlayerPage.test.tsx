import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PlayerPage } from '../PlayerPage'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import * as chessComApi from '../../services/chessComApi'

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

  it('renders a link back to search', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderPlayerPage()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
        'href',
        '/',
      )
    })
  })
})
