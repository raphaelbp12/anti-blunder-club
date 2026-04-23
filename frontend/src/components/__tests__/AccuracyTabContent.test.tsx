import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ChessGame } from '../../services/chessComApi'
import { trackEvent } from '../../utils/analytics'
import { AccuracyTabContent } from '../AccuracyTabContent'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

// Alice accuracies: 90, 80, 70 → mean 80. Below avg: 70
const mockGames: ChessGame[] = [
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
    white: { username: 'alice', rating: 1520, result: 'checkmated' },
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

function renderAccuracyTab(games: ChessGame[] = mockGames, username = 'alice') {
  return render(
    <MemoryRouter>
      <AccuracyTabContent games={games} username={username} />
    </MemoryRouter>,
  )
}

describe('AccuracyTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays the mean accuracy and games analyzed count', () => {
    renderAccuracyTab()

    expect(screen.getByText(/80\.0/)).toBeInTheDocument()
    expect(screen.getByText(/3 games analyzed/i)).toBeInTheDocument()
  })

  it('lists below-average games sorted worst first', () => {
    renderAccuracyTab()

    expect(screen.getByText(/70\.0/)).toBeInTheDocument()
    const belowAvgItems = screen.getAllByRole('listitem')
    expect(belowAvgItems).toHaveLength(1)
  })

  it('excludes games without accuracy data from analysis', () => {
    renderAccuracyTab()

    expect(screen.getByText(/3 games analyzed/i)).toBeInTheDocument()
    expect(screen.queryByText(/eve/i)).not.toBeInTheDocument()
  })

  it('shows empty state when no games have accuracy data', () => {
    const noAccuracy: ChessGame[] = [
      {
        url: 'https://www.chess.com/game/live/999',
        white: { username: 'alice', rating: 1500, result: 'win' },
        black: { username: 'bob', rating: 1400, result: 'loss' },
        timeClass: 'blitz',
        endTime: 1711900000,
      },
    ]
    renderAccuracyTab(noAccuracy)

    expect(screen.getByText(/no accuracy data/i)).toBeInTheDocument()
  })

  it('fires analysis_viewed event on mount', () => {
    renderAccuracyTab()

    expect(trackEvent).toHaveBeenCalledWith('analysis_viewed', {
      username: 'alice',
      games_analyzed: 3,
      mean_accuracy: 80,
    })
  })

  it('shows a result badge (W/L/D) on each below-average game card', () => {
    renderAccuracyTab()

    // The single below-average game is the 70% bullet game where alice lost.
    const belowAvgItem = screen.getAllByRole('listitem')[0]
    expect(belowAvgItem).toHaveTextContent('L')
    expect(belowAvgItem.querySelector('[aria-label="Defeat"]')).not.toBeNull()
  })
})
