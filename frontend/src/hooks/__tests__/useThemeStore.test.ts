import { useThemeStore } from '../useThemeStore'

describe('useThemeStore', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    useThemeStore.setState({ isDark: true })
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('defaults to dark mode', () => {
    expect(useThemeStore.getState().isDark).toBe(true)
  })

  it('toggle switches from dark to light', () => {
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().isDark).toBe(false)
  })

  it('toggle switches from light to dark', () => {
    useThemeStore.setState({ isDark: false })
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().isDark).toBe(true)
  })

  it('initFromSystem reads "dark" from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    useThemeStore.getState().initFromSystem()
    expect(useThemeStore.getState().isDark).toBe(true)
  })

  it('initFromSystem reads "light" from localStorage', () => {
    localStorage.setItem('theme', 'light')
    useThemeStore.getState().initFromSystem()
    expect(useThemeStore.getState().isDark).toBe(false)
  })

  it('initFromSystem defaults to dark when no preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    useThemeStore.getState().initFromSystem()
    expect(useThemeStore.getState().isDark).toBe(true)
  })

  it('initFromSystem respects prefers-color-scheme: light', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    useThemeStore.getState().initFromSystem()
    expect(useThemeStore.getState().isDark).toBe(false)
  })

  it('toggle persists preference to localStorage', () => {
    useThemeStore.getState().toggle()
    expect(localStorage.getItem('theme')).toBe('light')

    useThemeStore.getState().toggle()
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('initFromSystem adds dark class to documentElement', () => {
    useThemeStore.getState().initFromSystem()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggle removes dark class when switching to light', () => {
    document.documentElement.classList.add('dark')
    useThemeStore.getState().toggle()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
