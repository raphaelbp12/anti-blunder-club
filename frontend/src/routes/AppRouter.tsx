import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { MatchPage } from '../pages/MatchPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PlayerPage } from '../pages/PlayerPage'

function AnalysisRedirect() {
  const { username } = useParams<{ username: string }>()
  return <Navigate to={`/player/${username}?tab=accuracy`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:username" element={<PlayerPage />} />
      <Route path="/player/:username/analysis" element={<AnalysisRedirect />} />
      <Route path="/player/:username/match/:gameId" element={<MatchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
