import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach } from 'vitest'
import { trackEvent } from '../../utils/analytics'
import { MatchList } from '../MatchList'
import type { ChessGame } from '../../services/chessComApi'
import { Classification } from '../../services/analysis/constants/Classification'
import { PieceColour } from '../../services/analysis/constants/PieceColour'
import type { AnalyzedMove } from '../../services/analysis/analyzeGame'
import { useAnalysisStore } from '../../stores/useAnalysisStore'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockGames: ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1400, result: 'checkmated' },
    timeClass: 'blitz',
    endTime: 1711900000,
    accuracies: { white: 95.5, black: 88.2 },
  },
  {
    url: 'https://www.chess.com/game/live/222',
    white: { username: 'charlie', rating: 1600, result: 'agreed' },
    black: { username: 'alice', rating: 1500, result: 'agreed' },
    timeClass: 'rapid',
    endTime: 1711910000,
  },
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('MatchList', () => {
  it('renders an empty state when there are no games', () => {
    renderWithRouter(<MatchList games={[]} username="alice" />)
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
  })

  it('renders player usernames for each game', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('alice')
    expect(items[0]).toHaveTextContent('bob')
    expect(items[1]).toHaveTextContent('charlie')
  })

  it('renders player ratings', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('1500')
    expect(items[0]).toHaveTextContent('1400')
  })

  it('renders the time class for each game', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    expect(screen.getByText(/blitz/i)).toBeInTheDocument()
    expect(screen.getByText(/rapid/i)).toBeInTheDocument()
  })

  it('renders accuracies when available', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('95.5')
    expect(items[0]).toHaveTextContent('88.2')
  })

  it('renders dashes when accuracies are missing', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveTextContent('—')
  })

  it('renders links to the match detail page', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/player/alice/match/111')
    expect(links[1]).toHaveAttribute('href', '/player/alice/match/222')
  })

  it('fires match_view event when View link is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const links = screen.getAllByRole('link', { name: /view/i })
    await user.click(links[0])
    expect(trackEvent).toHaveBeenCalledWith('match_view', {
      username: 'alice',
      game_id: '111',
    })
  })

  it('renders a W/L/D result badge for the queried player on each row', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')

    // alice won game 1
    expect(items[0].querySelector('[aria-label="Victory"]')).not.toBeNull()
    expect(items[0]).toHaveTextContent('W')

    // alice drew game 2
    expect(items[1].querySelector('[aria-label="Draw"]')).not.toBeNull()
    expect(items[1]).toHaveTextContent('D')
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

    it('shows a mistake-summary row when the store has a done analysis for the queried player', () => {
      // alice plays White in game 111.
      useAnalysisStore.setState({
        byGameId: {
          '111': {
            status: 'done',
            durationMs: 0,
            result: {
              moves: [
                move(PieceColour.WHITE, Classification.BLUNDER),
                move(PieceColour.WHITE, Classification.MISTAKE),
                move(PieceColour.BLACK, Classification.BLUNDER),
              ],
              accuracy: { white: 50, black: 50 },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              analysis: {} as any,
            },
          },
        },
      })
      renderWithRouter(<MatchList games={mockGames} username="alice" />)
      const items = screen.getAllByRole('listitem')

      // Alice (White) counts in the first card: 1 blunder + 1 mistake.
      expect(items[0].querySelector('[aria-label="1 Blunder"]')).not.toBeNull()
      expect(items[0].querySelector('[aria-label="1 Mistake"]')).not.toBeNull()

      // Second game has no analysis entry → no summary row.
      expect(items[1].querySelector('[aria-label$="Blunder"]')).toBeNull()
      expect(items[1].querySelector('[aria-label$="Mistake"]')).toBeNull()
    })

    it('does not render the summary row when analysis is still running', () => {
      useAnalysisStore.setState({
        byGameId: { '111': { status: 'running', progress: 0.5 } },
      })
      renderWithRouter(<MatchList games={mockGames} username="alice" />)
      const items = screen.getAllByRole('listitem')
      expect(items[0].querySelector('[aria-label$="Blunder"]')).toBeNull()
      expect(items[0].querySelector('[aria-label$="Mistake"]')).toBeNull()
    })
  })
})
