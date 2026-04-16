import { Link } from 'react-router-dom'

interface PlayerNavbarProps {
  username: string
}

export function PlayerNavbar({ username }: PlayerNavbarProps) {
  return (
    <nav className="flex w-full max-w-2xl gap-4">
      <Link
        to={`/player/${username}`}
        className="text-blue-600 hover:underline"
      >
        Matches
      </Link>
      <Link
        to={`/player/${username}/analysis`}
        className="text-blue-600 hover:underline"
      >
        Analysis
      </Link>
    </nav>
  )
}
