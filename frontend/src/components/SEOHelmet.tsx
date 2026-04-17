import { Helmet } from 'react-helmet-async'

const BASE_URL = 'https://raphaelbp12.github.io/anti-blunder-club'
const SITE_NAME = 'Anti-Blunder Club'

interface SEOHelmetProps {
  title: string
  description: string
  path?: string
  noindex?: boolean
}

export function SEOHelmet({
  title,
  description,
  path,
  noindex,
}: SEOHelmetProps) {
  const fullTitle = `${title} | ${SITE_NAME}`
  const canonicalUrl = path !== undefined ? `${BASE_URL}${path}` : undefined

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  )
}
