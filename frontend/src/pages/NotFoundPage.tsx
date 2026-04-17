import { SEOHelmet } from '../components/SEOHelmet'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <SEOHelmet
        title="Page Not Found"
        description="The page you are looking for does not exist."
        noindex
      />
      <h1 className="text-4xl font-bold">Page Not Found</h1>
      <p className="mt-4 text-lg text-secondary">
        The page you are looking for does not exist.
      </p>
    </main>
  )
}
