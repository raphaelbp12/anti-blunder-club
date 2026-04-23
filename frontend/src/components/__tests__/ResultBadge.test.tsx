import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ResultBadge } from '../ResultBadge'

describe('ResultBadge', () => {
  it('renders a "W" with Victory label for a win', () => {
    render(<ResultBadge result="win" />)
    const badge = screen.getByLabelText(/victory/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('W')
  })

  it('renders an "L" with Defeat label for a loss', () => {
    render(<ResultBadge result="loss" />)
    const badge = screen.getByLabelText(/defeat/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('L')
  })

  it('renders a "D" with Draw label for a draw', () => {
    render(<ResultBadge result="draw" />)
    const badge = screen.getByLabelText(/draw|stalemate/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('D')
  })

  it('renders a "?" for unknown results', () => {
    render(<ResultBadge result="unknown" />)
    expect(screen.getByLabelText(/unknown result/i)).toHaveTextContent('?')
  })

  it('applies distinct color classes per result (win vs loss)', () => {
    const { rerender } = render(<ResultBadge result="win" />)
    const winClass = screen.getByText('W').className
    rerender(<ResultBadge result="loss" />)
    const lossClass = screen.getByText('L').className
    expect(winClass).not.toEqual(lossClass)
  })
})
