import { useNavigate } from 'react-router-dom'
import { PlayerCard } from '../components/PlayerCard'
import { PlayerSearch } from '../components/PlayerSearch'
import { useSearchHistoryStore } from '../stores/useSearchHistoryStore'

export function HomePage() {
  const navigate = useNavigate()
  const history = useSearchHistoryStore((s) => s.history)
  const removePlayer = useSearchHistoryStore((s) => s.removePlayer)

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

      {history.length > 0 && (
        <section className="flex w-full max-w-md flex-col gap-3">
          <h2 className="text-xl font-semibold text-primary">Recent Players</h2>
          {history.map((entry) => (
            <PlayerCard
              key={entry.username}
              username={entry.username}
              avatarUrl={entry.avatarUrl}
              highestRating={entry.highestRating}
              onDelete={removePlayer}
              onClick={(username) => navigate(`/player/${username}`)}
            />
          ))}
        </section>
      )}
    </main>
  )
}
