import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Page Not Found</h1>
      <p className="mt-4 text-lg text-gray-600">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="mt-6 text-blue-600 underline hover:text-blue-800">
        Go back home
      </Link>
    </main>
  )
}
