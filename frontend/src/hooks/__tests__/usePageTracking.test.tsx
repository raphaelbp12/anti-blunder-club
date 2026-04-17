import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { trackPageView } from '../../utils/analytics'
import { usePageTracking } from '../usePageTracking'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}))

function wrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    )
  }
}

describe('usePageTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires trackPageView on initial render with current path', () => {
    renderHook(() => usePageTracking(), {
      wrapper: wrapper('/player/hikaru'),
    })

    expect(trackPageView).toHaveBeenCalledWith('/player/hikaru')
  })

  it('fires trackPageView with root path', () => {
    renderHook(() => usePageTracking(), {
      wrapper: wrapper('/'),
    })

    expect(trackPageView).toHaveBeenCalledWith('/')
  })
})
