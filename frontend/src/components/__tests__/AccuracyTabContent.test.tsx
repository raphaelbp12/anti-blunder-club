import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach } from 'vitest'
import type { ChessGame } from '../../services/chessComApi'
import { trackEvent } from '../../utils/analytics'
import { AccuracyTabContent } from '../AccuracyTabContent'
import type { AnalyzedMove } from '../../services/analysis/analyzeGame'
import { Classification } from '../../services/analysis/constants/Classification'
import { PieceColour } from '../../services/analysis/constants/PieceColour'
import { summarizeClassifications } from '../../services/analysis/summarizeClassifications'
import { useAnalysisStore } from '../../stores/useAnalysisStore'

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

  describe('classification summary', () => {
    afterEach(() => {
      useAnalysisStore.setState({ byGameId: {} })
    })

    function move(
      colour: PieceColour,
      classification: Classification,
    ): AnalyzedMove {
      return {
        san: 'e4',
        uci: 'e2e4',
        fen: '',
        moveColour: colour,
        classification,
      }
    }

    it('shows a mistake-summary row on a below-average card when analysis is done', () => {
      // Below-average game is gameId=333 (alice playing White, 70% accuracy).
      const moves = [
        move(PieceColour.WHITE, Classification.BLUNDER),
        move(PieceColour.WHITE, Classification.INACCURACY),
        move(PieceColour.BLACK, Classification.BLUNDER),
      ]
      useAnalysisStore.setState({
        byGameId: {
          '333': {
            status: 'done',
            durationMs: 0,
            analysedAt: 1,
            summary: summarizeClassifications(moves),
            accuracy: { white: 70, black: 95 },
            result: {
              moves,
              accuracy: { white: 70, black: 95 },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              analysis: {} as any,
            },
          },
        },
      })
      renderAccuracyTab()
      const belowAvgItem = screen.getAllByRole('listitem')[0]
      expect(
        belowAvgItem.querySelector('[aria-label="1 Blunder"]'),
      ).not.toBeNull()
      expect(
        belowAvgItem.querySelector('[aria-label="1 Inaccuracy"]'),
      ).not.toBeNull()
    })

    it('omits the summary row when no analysis exists for the game', () => {
      renderAccuracyTab()
      const belowAvgItem = screen.getAllByRole('listitem')[0]
      expect(belowAvgItem.querySelector('[aria-label$="Blunder"]')).toBeNull()
    })
  })
})
