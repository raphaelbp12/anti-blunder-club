import { useNavigate } from 'react-router-dom'
import { PlayerSearch } from '../components/PlayerSearch'

export function HomePage() {
  const navigate = useNavigate()

  function handleSearch(username: string) {
    navigate(`/player/${username}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Anti-Blunder Club</h1>
      <p className="text-lg text-secondary">
        Search for a Chess.com player to see their recent matches.
      </p>
      <PlayerSearch onSearch={handleSearch} isLoading={false} />
    </main>
  )
}
