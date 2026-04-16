import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerNavbar } from '../PlayerNavbar'

function renderNavbar(username: string) {
  return render(
    <MemoryRouter>
      <PlayerNavbar username={username} />
    </MemoryRouter>,
  )
}

describe('PlayerNavbar', () => {
  it('renders a navigation landmark', () => {
    renderNavbar('hikaru')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders a Matches link pointing to the player page', () => {
    renderNavbar('hikaru')
    const link = screen.getByRole('link', { name: /matches/i })
    expect(link).toHaveAttribute('href', '/player/hikaru')
  })

  it('renders an Analysis link pointing to the analysis page', () => {
    renderNavbar('hikaru')
    const link = screen.getByRole('link', { name: /analysis/i })
    expect(link).toHaveAttribute('href', '/player/hikaru/analysis')
  })
})
