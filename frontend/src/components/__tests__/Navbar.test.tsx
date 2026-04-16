import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useThemeStore } from '../../hooks/useThemeStore'
import { Navbar } from '../Navbar'

function renderNavbar(username?: string) {
  return render(
    <MemoryRouter>
      <Navbar username={username} />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDark: true })
  })

  it('renders a navigation landmark', () => {
    renderNavbar()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('always renders a Home link pointing to /', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: /home/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders Matches link when username is provided', () => {
    renderNavbar('hikaru')
    const link = screen.getByRole('link', { name: /matches/i })
    expect(link).toHaveAttribute('href', '/player/hikaru')
  })

  it('renders Analysis link when username is provided', () => {
    renderNavbar('hikaru')
    const link = screen.getByRole('link', { name: /analysis/i })
    expect(link).toHaveAttribute('href', '/player/hikaru/analysis')
  })

  it('does not render Matches link when no username', () => {
    renderNavbar()
    expect(
      screen.queryByRole('link', { name: /matches/i }),
    ).not.toBeInTheDocument()
  })

  it('does not render Analysis link when no username', () => {
    renderNavbar()
    expect(
      screen.queryByRole('link', { name: /analysis/i }),
    ).not.toBeInTheDocument()
  })

  it('renders a theme toggle button', () => {
    renderNavbar()
    expect(
      screen.getByRole('button', { name: /toggle theme/i }),
    ).toBeInTheDocument()
  })

  it('clicking toggle flips isDark in the store', async () => {
    renderNavbar()
    const user = userEvent.setup()

    expect(useThemeStore.getState().isDark).toBe(true)
    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(useThemeStore.getState().isDark).toBe(false)
  })
})
