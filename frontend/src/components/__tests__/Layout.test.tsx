import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useThemeStore } from '../../hooks/useThemeStore'
import { trackPageView } from '../../utils/analytics'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import { useConsentStore } from '../../stores/useConsentStore'
import { Layout } from '../Layout'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
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

  const originalGtag = window.gtag

  beforeEach(() => {
    useThemeStore.setState({ isDark: true })
    usePlayerGamesStore.setState({ lastUsername: null })
    useConsentStore.setState({ consent: 'pending' })
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    window.gtag = originalGtag
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
      screen.queryByRole('link', { name: /matches/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /analysis/i }),
    ).not.toBeInTheDocument()
  })

  it('shows player tabs on a player route', () => {
    renderLayout(['/player/hikaru'])
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /matches/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /analysis/i })).toBeInTheDocument()
  })

  it('shows player tabs on a match route', () => {
    renderLayout(['/player/hikaru/match/123'])
    expect(screen.getByRole('link', { name: /matches/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /analysis/i })).toBeInTheDocument()
  })

  it('shows player tabs on the analysis route', () => {
    renderLayout(['/player/hikaru/analysis'])
    expect(screen.getByRole('link', { name: /matches/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /analysis/i })).toBeInTheDocument()
  })

  it('shows player tabs on home page when lastUsername is set', () => {
    usePlayerGamesStore.setState({ lastUsername: 'hikaru' })
    renderLayout(['/'])
    expect(screen.getByRole('link', { name: /matches/i })).toHaveAttribute(
      'href',
      '/player/hikaru',
    )
    expect(screen.getByRole('link', { name: /analysis/i })).toHaveAttribute(
      'href',
      '/player/hikaru/analysis',
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

  it('fires trackPageView on mount', () => {
    renderLayout(['/player/hikaru'])
    expect(trackPageView).toHaveBeenCalledWith('/player/hikaru')
  })

  it('calls initConsent on mount with granted state', () => {
    useConsentStore.setState({ consent: 'granted' })
    window.gtag = vi.fn()
    renderLayout(['/'])
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
    })
  })

  it('renders cookie consent banner when consent is pending', () => {
    useConsentStore.setState({ consent: 'pending' })
    renderLayout(['/'])
    expect(
      screen.getByRole('region', { name: /cookie consent/i }),
    ).toBeInTheDocument()
  })

  it('does not render cookie consent banner when consent is granted', () => {
    useConsentStore.setState({ consent: 'granted' })
    renderLayout(['/'])
    expect(
      screen.queryByRole('region', { name: /cookie consent/i }),
    ).not.toBeInTheDocument()
  })
})
