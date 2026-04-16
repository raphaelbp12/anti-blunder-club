import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  initFromSystem: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,

  toggle: () => {
    const next = !get().isDark
    set({ isDark: next })
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  },

  initFromSystem: () => {
    const stored = localStorage.getItem('theme')
    let isDark: boolean

    if (stored === 'light') {
      isDark = false
    } else if (stored === 'dark') {
      isDark = true
    } else {
      const prefersLight = window.matchMedia(
        '(prefers-color-scheme: light)',
      ).matches
      isDark = !prefersLight
    }

    set({ isDark })
    document.documentElement.classList.toggle('dark', isDark)
  },
}))
