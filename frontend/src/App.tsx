import { BrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Layout>
        <AppRouter />
      </Layout>
    </BrowserRouter>
  )
}
