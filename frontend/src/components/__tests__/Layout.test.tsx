import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useThemeStore } from '../../hooks/useThemeStore'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import { Layout } from '../Layout'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

function renderLayout(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    useThemeStore.setState({ isDark: true })
    usePlayerGamesStore.setState({ lastUsername: null })
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('renders the navbar on the home page', () => {
    renderLayout(['/'])
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('shows only Home link when no player is selected', () => {
    renderLayout(['/'])
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /dashboard/i }),
    ).not.toBeInTheDocument()
  })

  it('shows Dashboard link on a player route', () => {
    renderLayout(['/player/hikaru'])
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('shows Dashboard link on a match route', () => {
    renderLayout(['/player/hikaru/match/123'])
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('shows Dashboard link on the analysis route', () => {
    renderLayout(['/player/hikaru/analysis'])
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('shows Dashboard link on home page when lastUsername is set', () => {
    usePlayerGamesStore.setState({ lastUsername: 'hikaru' })
    renderLayout(['/'])
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/player/hikaru',
    )
  })

  it('calls initFromSystem on mount', () => {
    renderLayout(['/'])
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('renders children', () => {
    renderLayout(['/'])
    expect(screen.getByText('page content')).toBeInTheDocument()
  })
})
