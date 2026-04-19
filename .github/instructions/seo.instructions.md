---
applyTo: "frontend/{src/pages/**,public/sitemap.xml,index.html}"
description: "SEO conventions: SEOHelmet per page, sitemap, static meta in index.html"
---

# SEO Instructions

**Hosting:** GitHub Pages at `https://raphaelbp12.github.io/anti-blunder-club/` — static hosting, no SSR.

## Layers

- **Static meta tags** in `index.html` — description, keywords, Open Graph, Twitter Card, canonical, JSON-LD (`WebApplication` schema). What crawlers see before JS runs.
- **Per-page dynamic meta** via `react-helmet-async` — the `SEOHelmet` component in `src/components/SEOHelmet.tsx` sets `<title>`, description, and OG tags per page.
- `HelmetProvider` wraps the app in `App.tsx`.
- **Static SEO files** in `public/`: `robots.txt`, `sitemap.xml`, `manifest.json`.
- **Sitemap** only lists static routes (homepage). Dynamic `/player/:username` routes aren't crawlable without SSR.
- **NotFoundPage** uses `noindex` to prevent 404 pages from being indexed.

## Rules

Every page component must include:

```tsx
<SEOHelmet title="..." description="..." path="..." />
```

When adding a new page with a **static URL**, also add it to `public/sitemap.xml`.

When adding a new page with a **dynamic URL** (`/foo/:id`), do not add it to the sitemap, but still include `<SEOHelmet>`.
