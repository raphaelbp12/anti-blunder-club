import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Layout } from './components/Layout'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Layout>
          <AppRouter />
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  )
}
