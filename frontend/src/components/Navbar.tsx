import { useThemeStore } from '../hooks/useThemeStore'
import { TrackedButton } from './TrackedButton'
import { TrackedLink } from './TrackedLink'

interface NavbarProps {
  username?: string
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

export function Navbar({ username }: NavbarProps) {
  const { isDark, toggle } = useThemeStore()

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
      <div className="ml-auto">
        <TrackedButton
          eventName="theme_toggle"
          eventParams={{ new_theme: isDark ? 'light' : 'dark' }}
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-md p-2 text-secondary hover:text-primary"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </TrackedButton>
      </div>
    </nav>
  )
}
