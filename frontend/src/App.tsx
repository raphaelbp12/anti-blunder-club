import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <BrowserRouter basename="/anti-blunder-club">
      <AppRouter />
    </BrowserRouter>
  )
}
