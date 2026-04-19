import { SEOHelmet } from '../components/SEOHelmet'
import { TrackedExternalLink } from '../components/TrackedExternalLink'

const DISCORD_URL = 'https://discord.gg/qfrXu8WQhu'
const SOURCE_URL = 'https://github.com/raphaelbp12/anti-blunder-club'
const ISSUES_URL = 'https://github.com/raphaelbp12/anti-blunder-club/issues'
const WINTRCHESS_URL = 'https://github.com/WintrCat/wintrchess'
const STOCKFISH_URL = 'https://stockfishchess.org/'
const LICENSE_URL =
  'https://github.com/raphaelbp12/anti-blunder-club/blob/main/LICENSE'

export function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <SEOHelmet
        title="About"
        description="Anti-Blunder Club is a free, client-side web app that helps chess players learn from their own Chess.com games."
        path="/about"
      />

      <h1 className="text-4xl font-bold">About</h1>

      <section
        aria-labelledby="discord-heading"
        className="mt-8 rounded-lg border border-accent bg-accent/10 p-6"
      >
        <h2 id="discord-heading" className="text-2xl font-semibold">
          Join the community
        </h2>
        <p className="mt-2 text-secondary">
          Feedback, questions, suggestions — all very welcome. Come say hi on
          Discord.
        </p>
        <TrackedExternalLink
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          eventName="about_discord_clicked"
          className="mt-4 inline-block rounded-md bg-accent px-5 py-2 font-medium text-white hover:bg-accent-hover"
        >
          Join our Discord
        </TrackedExternalLink>
      </section>

      <section aria-labelledby="what-heading" className="mt-10">
        <h2 id="what-heading" className="text-2xl font-semibold">
          What is Anti-Blunder Club?
        </h2>
        <p className="mt-2 text-secondary">
          Anti-Blunder Club is a free web app that helps chess players learn
          from their own games. Search for a Chess.com username, browse recent
          matches, and (soon) analyse them with a built-in engine — all without
          leaving the browser.
        </p>
      </section>

      <section aria-labelledby="points-heading" className="mt-10">
        <h2 id="points-heading" className="text-2xl font-semibold">
          Key points
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-secondary">
          <li>
            <strong>Fully client-side.</strong> The app runs entirely in your
            browser and does not store any of your data on a server.
          </li>
          <li>
            <strong>Free to use.</strong> No accounts, no paywall, no ads.
          </li>
          <li>
            <strong>Goal:</strong> help players learn chess by turning their own
            games into study material.
          </li>
          <li>
            <strong>Feedback is appreciated.</strong> Say hi on{' '}
            <TrackedExternalLink
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="about_feedback_link_clicked"
              eventParams={{ destination: 'discord' }}
              className="text-accent hover:text-accent-hover underline"
            >
              feedback on Discord
            </TrackedExternalLink>{' '}
            or{' '}
            <TrackedExternalLink
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="about_feedback_link_clicked"
              eventParams={{ destination: 'github_issues' }}
              className="text-accent hover:text-accent-hover underline"
            >
              open an issue on GitHub
            </TrackedExternalLink>
            .
          </li>
        </ul>
      </section>

      <section aria-labelledby="credits-heading" className="mt-10">
        <h2 id="credits-heading" className="text-2xl font-semibold">
          Credits &amp; source
        </h2>
        <ul className="mt-4 space-y-2 text-secondary">
          <li>
            <strong>License:</strong>{' '}
            <TrackedExternalLink
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="external_link_click"
              eventParams={{ destination: LICENSE_URL, link_name: 'License' }}
              className="text-accent hover:text-accent-hover underline"
            >
              GPL-3.0-or-later
            </TrackedExternalLink>
            .
          </li>
          <li>
            <strong>Source code:</strong>{' '}
            <TrackedExternalLink
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="about_source_clicked"
              className="text-accent hover:text-accent-hover underline"
            >
              source code on GitHub
            </TrackedExternalLink>
            .
          </li>
          <li>
            <strong>Inspiration:</strong> heavily inspired by{' '}
            <TrackedExternalLink
              href={WINTRCHESS_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="about_wintrchess_clicked"
              className="text-accent hover:text-accent-hover underline"
            >
              WintrChess
            </TrackedExternalLink>{' '}
            — its analysis pipeline and Stockfish integration patterns informed
            the design of this project.
          </li>
          <li>
            <strong>Engine:</strong>{' '}
            <TrackedExternalLink
              href={STOCKFISH_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="external_link_click"
              eventParams={{
                destination: STOCKFISH_URL,
                link_name: 'Stockfish',
              }}
              className="text-accent hover:text-accent-hover underline"
            >
              Stockfish
            </TrackedExternalLink>
            , used under its GPL-3.0 license.
          </li>
        </ul>
      </section>
    </main>
  )
}
