import { render } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { SEOHelmet } from '../SEOHelmet'

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>)
}

describe('SEOHelmet', () => {
  it('sets the document title with site suffix', async () => {
    renderWithHelmet(
      <SEOHelmet title="Player Games" description="View chess games" />,
    )

    const helmet = document.querySelector('title')
    expect(helmet?.textContent).toBe('Player Games | Anti-Blunder Club')
  })

  it('sets meta description', () => {
    renderWithHelmet(
      <SEOHelmet title="Home" description="Analyze your chess games" />,
    )

    const meta = document.querySelector('meta[name="description"]')
    expect(meta?.getAttribute('content')).toBe('Analyze your chess games')
  })

  it('sets Open Graph tags', () => {
    renderWithHelmet(
      <SEOHelmet
        title="Player Games"
        description="View chess games"
        path="/player/hikaru"
      />,
    )

    expect(
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute('content'),
    ).toBe('Player Games | Anti-Blunder Club')
    expect(
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content'),
    ).toBe('View chess games')
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe('https://raphaelbp12.github.io/anti-blunder-club/player/hikaru')
  })

  it('sets Twitter Card tags', () => {
    renderWithHelmet(
      <SEOHelmet title="Analysis" description="Chess accuracy analysis" />,
    )

    expect(
      document
        .querySelector('meta[name="twitter:title"]')
        ?.getAttribute('content'),
    ).toBe('Analysis | Anti-Blunder Club')
    expect(
      document
        .querySelector('meta[name="twitter:description"]')
        ?.getAttribute('content'),
    ).toBe('Chess accuracy analysis')
  })

  it('sets canonical link', () => {
    renderWithHelmet(
      <SEOHelmet title="Home" description="Home page" path="/" />,
    )

    const link = document.querySelector('link[rel="canonical"]')
    expect(link?.getAttribute('href')).toBe(
      'https://raphaelbp12.github.io/anti-blunder-club/',
    )
  })

  it('adds noindex meta when noindex prop is true', () => {
    renderWithHelmet(
      <SEOHelmet title="Not Found" description="Page not found" noindex />,
    )

    const meta = document.querySelector('meta[name="robots"]')
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow')
  })

  it('does not add robots meta when noindex is false', () => {
    renderWithHelmet(<SEOHelmet title="Home" description="Home page" />)

    const meta = document.querySelector('meta[name="robots"]')
    expect(meta).toBeNull()
  })
})
