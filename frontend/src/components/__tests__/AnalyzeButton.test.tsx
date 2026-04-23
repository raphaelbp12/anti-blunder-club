// SPDX-License-Identifier: GPL-3.0-or-later
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChessGame } from '../../services/chessComApi'
import { useAnalysisQueueStore } from '../../stores/useAnalysisQueueStore'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import { AnalyzeButton } from '../AnalyzeButton'

const game: ChessGame = {
  url: 'https://www.chess.com/game/live/123',
  white: { username: 'alice', rating: 1500, result: 'win' },
  black: { username: 'bob', rating: 1400, result: 'checkmated' },
  timeClass: 'blitz',
  endTime: 1711900000,
  pgn: '1. e4 e5',
}

function reset() {
  useAnalysisStore.setState({ byGameId: {} })
  useAnalysisQueueStore.setState({
    pending: [],
    running: [],
    batchTotal: 0,
    batchDone: 0,
    concurrency: 1,
  })
}

describe('<AnalyzeButton>', () => {
  afterEach(reset)

  it('renders nothing when the game has no PGN', () => {
    const { container } = render(
      <AnalyzeButton gameId="123" pgn={undefined} game={game} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the session already has a full done entry', () => {
    useAnalysisStore.setState({
      byGameId: {
        '123': {
          status: 'done',
          durationMs: 0,
          analysedAt: 1,
          summary: { white: {} as never, black: {} as never },
          accuracy: { white: 0, black: 0 },
          result: {
            moves: [],
            accuracy: { white: 0, black: 0 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            analysis: {} as any,
          },
        },
      },
    })
    const { container } = render(
      <AnalyzeButton gameId="123" pgn="1. e4" game={game} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('enqueues the game on click', async () => {
    const enqueue = vi.fn()
    useAnalysisQueueStore.setState({ enqueue })
    render(<AnalyzeButton gameId="123" pgn="1. e4" game={game} />)

    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(enqueue).toHaveBeenCalledWith({
      gameId: '123',
      pgn: '1. e4',
      game,
    })
  })

  it('shows "Queued" with cancel when the game is pending', async () => {
    const cancel = vi.fn()
    useAnalysisQueueStore.setState({
      pending: [{ gameId: '123', pgn: '1. e4', game }],
      cancel,
    })
    render(<AnalyzeButton gameId="123" pgn="1. e4" game={game} />)

    const btn = screen.getByRole('button', { name: /queued/i })
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(cancel).toHaveBeenCalledWith('123')
  })

  it('shows running progress when the analysis is running', () => {
    useAnalysisStore.setState({
      byGameId: { '123': { status: 'running', progress: 0.42 } },
    })
    render(<AnalyzeButton gameId="123" pgn="1. e4" game={game} />)
    expect(screen.getByText(/analyzing… 42%/i)).toBeInTheDocument()
  })

  it('shows a retry button on error state', async () => {
    const enqueue = vi.fn()
    useAnalysisQueueStore.setState({ enqueue })
    useAnalysisStore.setState({
      byGameId: { '123': { status: 'error', error: 'boom' } },
    })
    render(<AnalyzeButton gameId="123" pgn="1. e4" game={game} />)

    const btn = screen.getByRole('button', { name: /retry/i })
    await userEvent.click(btn)
    expect(enqueue).toHaveBeenCalledWith({
      gameId: '123',
      pgn: '1. e4',
      game,
    })
  })
})
