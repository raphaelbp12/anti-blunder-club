import { useState, type FormEvent } from 'react'

interface PlayerSearchProps {
  onSearch: (username: string) => void
  isLoading: boolean
}

export function PlayerSearch({ onSearch, isLoading }: PlayerSearchProps) {
  const [username, setUsername] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSearch(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
      <label htmlFor="username-input" className="sr-only">
        Username
      </label>
      <input
        id="username-input"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Chess.com username"
        className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-primary"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}
