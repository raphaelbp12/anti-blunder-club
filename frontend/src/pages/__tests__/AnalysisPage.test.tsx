import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AnalysisPage } from '../AnalysisPage'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import * as chessComApi from '../../services/chessComApi'

// Alice accuracies: 90, 80, 70 → mean 80. Below avg: 70
const mockGames: chessComApi.ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1400, result: 'loss' },
    timeClass: 'blitz',
    endTime: 1711900000,
    accuracies: { white: 90.0, black: 75.0 },
  },
  {
    url: 'https://www.chess.com/game/live/222',
    white: { username: 'charlie', rating: 1600, result: 'loss' },
    black: { username: 'alice', rating: 1510, result: 'win' },
    timeClass: 'rapid',
    endTime: 1711900100,
    accuracies: { white: 60.0, black: 80.0 },
  },
  {
    url: 'https://www.chess.com/game/live/333',
    white: { username: 'alice', rating: 1520, result: 'loss' },
    black: { username: 'dan', rating: 1700, result: 'win' },
    timeClass: 'bullet',
    endTime: 1711900200,
    accuracies: { white: 70.0, black: 95.0 },
  },
  {
    url: 'https://www.chess.com/game/live/444',
    white: { username: 'alice', rating: 1520, result: 'win' },
    black: { username: 'eve', rating: 1300, result: 'loss' },
    timeClass: 'blitz',
    endTime: 1711900300,
  },
]

function renderAnalysisPage(username = 'alice') {
  return render(
    <MemoryRouter initialEntries={[`/player/${username}/analysis`]}>
      <Routes>
        <Route path="/player/:username/analysis" element={<AnalysisPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AnalysisPage', () => {
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
    renderAnalysisPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /alice.*accuracy analysis/i }),
      ).toBeInTheDocument()
    })
  })

  it('displays the mean accuracy and games analyzed count', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/80\.0/)).toBeInTheDocument()
      expect(screen.getByText(/3 games analyzed/i)).toBeInTheDocument()
    })
  })

  it('lists below-average games sorted worst first', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/70\.0/)).toBeInTheDocument()
    })

    // Only the game with accuracy 70 is below the mean of 80
    const belowAvgItems = screen.getAllByRole('listitem')
    expect(belowAvgItems).toHaveLength(1)
  })

  it('excludes games without accuracy data', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/3 games analyzed/i)).toBeInTheDocument()
    })
    // eve's game (no accuracy) should not appear
    expect(screen.queryByText(/eve/i)).not.toBeInTheDocument()
  })

  it('shows loading state while fetching', () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockImplementation(
      () => new Promise(() => {}),
    )
    usePlayerGamesStore.setState({ isLoading: true })
    renderAnalysisPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )
    renderAnalysisPage('nobody')

    await waitFor(() => {
      expect(screen.getByText(/Player "nobody" not found/)).toBeInTheDocument()
    })
  })

  it('triggers fetchGames on mount', () => {
    const fetchSpy = vi
      .spyOn(chessComApi, 'fetchPlayerGames')
      .mockResolvedValue(mockGames)
    renderAnalysisPage()

    expect(fetchSpy).toHaveBeenCalledWith('alice')
  })

  it('uses cached store data without re-fetching', () => {
    const fetchSpy = vi.spyOn(chessComApi, 'fetchPlayerGames')
    usePlayerGamesStore.setState({
      gamesByUsername: { alice: mockGames },
    })
    renderAnalysisPage()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows empty state when no games have accuracy data', async () => {
    const noAccuracyGames: chessComApi.ChessGame[] = [
      {
        url: 'https://www.chess.com/game/live/999',
        white: { username: 'alice', rating: 1500, result: 'win' },
        black: { username: 'bob', rating: 1400, result: 'loss' },
        timeClass: 'blitz',
        endTime: 1711900000,
      },
    ]
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(noAccuracyGames)
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/no accuracy data/i)).toBeInTheDocument()
    })
  })

  it('renders the navigation bar', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })
})
