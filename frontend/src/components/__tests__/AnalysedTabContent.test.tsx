// SPDX-License-Identifier: GPL-3.0-or-later
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { AnalysedTabContent } from '../AnalysedTabContent'
import type { AnalyzedMove } from '../../services/analysis/analyzeGame'
import { Classification } from '../../services/analysis/constants/Classification'
import { PieceColour } from '../../services/analysis/constants/PieceColour'
import {
  emptyClassificationCounts,
  summarizeClassifications,
  type ClassificationSummary,
} from '../../services/analysis/summarizeClassifications'
import type { ChessGame } from '../../services/chessComApi'
import {
  useAnalysisStore,
  type AnalysisEntry,
} from '../../stores/useAnalysisStore'

function move(
  colour: PieceColour,
  classification: Classification,
): AnalyzedMove {
  return { san: 'e4', uci: 'e2e4', fen: '', moveColour: colour, classification }
}

function done(params: {
  analysedAt: number
  game?: ChessGame
  moves?: AnalyzedMove[]
  accuracy?: { white: number; black: number }
}): Extract<AnalysisEntry, { status: 'done' }> {
  const summary: ClassificationSummary = params.moves
    ? summarizeClassifications(params.moves)
    : {
        white: emptyClassificationCounts(),
        black: emptyClassificationCounts(),
      }
  return {
    status: 'done',
    durationMs: 0,
    analysedAt: params.analysedAt,
    summary,
    accuracy: params.accuracy ?? { white: 0, black: 0 },
    game: params.game,
  }
}

const gameA: ChessGame = {
  url: 'https://www.chess.com/game/live/111',
  white: { username: 'alice', rating: 1500, result: 'win' },
  black: { username: 'bob', rating: 1400, result: 'checkmated' },
  timeClass: 'blitz',
  endTime: 1711900000,
  accuracies: { white: 95.5, black: 88.2 },
}

const gameB: ChessGame = {
  url: 'https://www.chess.com/game/live/222',
  white: { username: 'charlie', rating: 1600, result: 'agreed' },
  black: { username: 'dan', rating: 1620, result: 'agreed' },
  timeClass: 'rapid',
  endTime: 1711910000,
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AnalysedTabContent />
    </MemoryRouter>,
  )
}

describe('<AnalysedTabContent>', () => {
  afterEach(() => {
    useAnalysisStore.setState({ byGameId: {} })
  })

  it('shows an empty state when there are no done analyses', () => {
    renderTab()
    expect(screen.getByText(/no games analysed yet/i)).toBeInTheDocument()
  })

  it('lists a card per done analysis, most recent first', () => {
    useAnalysisStore.setState({
      byGameId: {
        '111': done({
          analysedAt: 1_000_000,
          game: gameA,
          moves: [move(PieceColour.WHITE, Classification.BLUNDER)],
          accuracy: { white: 80, black: 90 },
        }),
        '222': done({
          analysedAt: 2_000_000,
          game: gameB,
          moves: [move(PieceColour.BLACK, Classification.MISTAKE)],
          accuracy: { white: 70, black: 75 },
        }),
      },
    })
    renderTab()
    const items = screen.getAllByTestId('analysed-game-card')
    expect(items).toHaveLength(2)
    // Most recently analysed (gameB, analysedAt=2_000_000) first.
    expect(items[0]).toHaveTextContent('charlie')
    expect(items[1]).toHaveTextContent('alice')
  })

  it('excludes running, idle, and error entries', () => {
    useAnalysisStore.setState({
      byGameId: {
        '111': done({ analysedAt: 1, game: gameA }),
        '222': { status: 'running', progress: 0.3 },
        '333': { status: 'error', error: 'oops' },
      },
    })
    renderTab()
    const items = screen.getAllByTestId('analysed-game-card')
    expect(items).toHaveLength(1)
  })

  it('omits done entries missing ChessGame metadata (no card to render)', () => {
    useAnalysisStore.setState({
      byGameId: {
        '111': done({ analysedAt: 1 }),
      },
    })
    renderTab()
    expect(screen.getByText(/no games analysed yet/i)).toBeInTheDocument()
  })

  it('renders accuracies and per-colour mistake summaries on each card', () => {
    useAnalysisStore.setState({
      byGameId: {
        '111': done({
          analysedAt: 1,
          game: gameA,
          moves: [
            move(PieceColour.WHITE, Classification.BLUNDER),
            move(PieceColour.BLACK, Classification.MISTAKE),
            move(PieceColour.BLACK, Classification.MISTAKE),
          ],
          accuracy: { white: 95.5, black: 88.2 },
        }),
      },
    })
    renderTab()
    const item = screen.getByTestId('analysed-game-card')
    expect(item).toHaveTextContent('95.5')
    expect(item).toHaveTextContent('88.2')
    expect(item.querySelector('[aria-label="1 Blunder"]')).not.toBeNull()
    expect(item.querySelector('[aria-label="2 Mistake"]')).not.toBeNull()
  })

  it("links to the Match page using the white player's profile", () => {
    useAnalysisStore.setState({
      byGameId: {
        '111': done({ analysedAt: 1, game: gameA }),
      },
    })
    renderTab()
    const link = screen.getByRole('link', { name: /view/i })
    expect(link).toHaveAttribute('href', '/player/alice/match/111')
  })
})
