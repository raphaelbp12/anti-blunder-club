import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from '../AppRouter'

describe('AppRouter', () => {
  it('renders the home page on the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /anti-blunder club/i }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})
