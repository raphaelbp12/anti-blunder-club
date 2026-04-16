import { render, screen } from '@testing-library/react'
import { HomePage } from '../HomePage'

describe('HomePage', () => {
  it('renders a heading with the app name', () => {
    render(<HomePage />)
    expect(
      screen.getByRole('heading', { name: /anti-blunder club/i }),
    ).toBeInTheDocument()
  })
})
