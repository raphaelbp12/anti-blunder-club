import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccuracyTabContent } from '../components/AccuracyTabContent'
import { FilterChips } from '../components/FilterChips'
import { GamesTabContent } from '../components/GamesTabContent'
import { SEOHelmet } from '../components/SEOHelmet'
import { TabBar } from '../components/TabBar'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  getHighestRating,
} from '../services/chessComApi'
import { usePlayerGamesStore } from '../stores/usePlayerGamesStore'
import { useSearchHistoryStore } from '../stores/useSearchHistoryStore'
import { trackEvent } from '../utils/analytics'

const TABS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'games', label: 'Games' },
]

const TIME_CLASS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Bullet', value: 'bullet' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Rapid', value: 'rapid' },
  { label: 'Daily', value: 'daily' },
]

export function PlayerPage() {
  const { username } = useParams<{ username: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'accuracy'
  const [timeClassFilter, setTimeClassFilter] = useState('all')

  const { gamesByUsername, isLoading, error, fetchGames } =
    usePlayerGamesStore()

  useEffect(() => {
    if (username) {
      fetchGames(username)
    }
  }, [username, fetchGames])

  const games = username ? (gamesByUsername[username] ?? []) : []
  const filteredGames =
    timeClassFilter === 'all'
      ? games
      : games.filter((g) => g.timeClass === timeClassFilter)

  const addPlayer = useSearchHistoryStore((s) => s.addPlayer)
  const profileFetchedFor = useRef<string | null>(null)
  const resultTrackedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!username || isLoading) return
    if (resultTrackedFor.current === username) return

    if (error) {
      resultTrackedFor.current = username
      trackEvent('player_search_result', {
        username,
        result: 'error',
        game_count: 0,
      })
    } else if (gamesByUsername[username]) {
      resultTrackedFor.current = username
      trackEvent('player_search_result', {
        username,
        result: 'success',
        game_count: gamesByUsername[username].length,
      })
    }
  }, [username, gamesByUsername, isLoading, error])

  useEffect(() => {
    if (!username || !gamesByUsername[username] || error || isLoading) return
    if (profileFetchedFor.current === username) return
    profileFetchedFor.current = username

    let cancelled = false

    async function fetchProfile() {
      try {
        const [profile, stats] = await Promise.all([
          fetchPlayerProfile(username!),
          fetchPlayerStats(username!),
        ])
        if (!cancelled) {
          addPlayer({
            username: profile.username,
            avatarUrl: profile.avatar,
            highestRating: getHighestRating(stats),
          })
        }
      } catch {
        if (!cancelled) {
          addPlayer({ username: username!, highestRating: null })
        }
      }
    }

    fetchProfile()
    return () => {
      cancelled = true
      profileFetchedFor.current = null
    }
  }, [username, gamesByUsername, error, isLoading, addPlayer])

  function handleTabChange(tabKey: string) {
    trackEvent('tab_switched', { tab_name: tabKey, from_tab: activeTab })
    setSearchParams({ tab: tabKey })
  }

  function handleFilterChange(value: string) {
    setTimeClassFilter(value)
    if (value !== 'all') {
      trackEvent('game_filter_applied', { filter_value: value })
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg text-secondary">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <SEOHelmet
        title={`${username}'s Chess Dashboard`}
        description={`View recent Chess.com games and accuracy stats for ${username}. Analyze blunders and improve your chess.`}
        path={`/player/${username}`}
      />
      {error && <p className="text-danger">{error}</p>}
      {!error && (
        <>
          <TabBar
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <FilterChips
            options={TIME_CLASS_OPTIONS}
            activeValue={timeClassFilter}
            onChange={handleFilterChange}
          />
          {activeTab === 'accuracy' && (
            <AccuracyTabContent
              games={filteredGames}
              username={username ?? ''}
            />
          )}
          {activeTab === 'games' && (
            <GamesTabContent games={filteredGames} username={username ?? ''} />
          )}
        </>
      )}
    </main>
  )
}
