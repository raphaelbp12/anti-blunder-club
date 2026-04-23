import { useEffect, useRef, useState } from 'react'
import { useThemeStore } from '../hooks/useThemeStore'
import { TrackedButton } from './TrackedButton'
import { TrackedExternalLink } from './TrackedExternalLink'
import { TrackedLink } from './TrackedLink'

interface NavbarProps {
  username?: string
}

const DISCORD_URL = 'https://discord.gg/qfrXu8WQhu'

function DiscordIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M20.317 4.369A19.791 19.791 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.682 4.37a.07.07 0 0 0-.032.027C2.533 9.046 1.675 13.58 2.096 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.699.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx={12} cy={12} r={5} />
      <line x1={12} y1={1} x2={12} y2={3} />
      <line x1={12} y1={21} x2={12} y2={23} />
      <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
      <line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
      <line x1={1} y1={12} x2={3} y2={12} />
      <line x1={21} y1={12} x2={23} y2={12} />
      <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
      <line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  )
}

export function Navbar({ username }: NavbarProps) {
  const { isDark, toggle } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <nav className="flex w-full items-center border-b border-border px-6 py-3">
      <div className="flex gap-4">
        <TrackedLink
          to="/"
          eventName="nav_click"
          eventParams={{ link_name: 'Home', destination: '/' }}
          className="text-accent hover:text-accent-hover font-medium"
        >
          Home
        </TrackedLink>
        {username && (
          <TrackedLink
            to={`/player/${username}`}
            eventName="nav_click"
            eventParams={{
              link_name: 'Dashboard',
              destination: `/player/${username}`,
            }}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Dashboard
          </TrackedLink>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <TrackedExternalLink
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          eventName="navbar_discord_clicked"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <DiscordIcon />
          <span className="hidden sm:inline">Join Discord</span>
        </TrackedExternalLink>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-secondary hover:text-primary"
          >
            <MenuIcon />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="Main menu"
              className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-surface p-2 shadow-lg"
            >
              <TrackedExternalLink
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                eventName="navbar_menu_discord_clicked"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <DiscordIcon />
                <span>Join Discord</span>
              </TrackedExternalLink>
              <TrackedLink
                to="/about"
                eventName="about_nav_clicked"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="mt-1 block rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-surface-alt hover:text-accent-hover"
              >
                About
              </TrackedLink>
              <TrackedButton
                eventName="theme_toggle"
                eventParams={{ new_theme: isDark ? 'light' : 'dark' }}
                onClick={toggle}
                role="menuitem"
                aria-label="Toggle theme"
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
              </TrackedButton>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
