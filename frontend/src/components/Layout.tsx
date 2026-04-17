import { useEffect, type ReactNode } from 'react'
import { useMatch } from 'react-router-dom'
import { usePageTracking } from '../hooks/usePageTracking'
import { useThemeStore } from '../hooks/useThemeStore'
import { usePlayerGamesStore } from '../stores/usePlayerGamesStore'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const initFromSystem = useThemeStore((s) => s.initFromSystem)
  const lastUsername = usePlayerGamesStore((s) => s.lastUsername)
  const playerMatch = useMatch('/player/:username/*')
  const username = playerMatch?.params.username ?? lastUsername ?? undefined

  usePageTracking()

  useEffect(() => {
    initFromSystem()
  }, [initFromSystem])

  return (
    <>
      <Navbar username={username} />
      {children}
    </>
  )
}
