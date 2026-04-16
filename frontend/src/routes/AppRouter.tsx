import { Routes, Route } from 'react-router-dom'
import { AnalysisPage } from '../pages/AnalysisPage'
import { HomePage } from '../pages/HomePage'
import { MatchPage } from '../pages/MatchPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PlayerPage } from '../pages/PlayerPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:username" element={<PlayerPage />} />
      <Route path="/player/:username/analysis" element={<AnalysisPage />} />
      <Route path="/player/:username/match/:gameId" element={<MatchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
