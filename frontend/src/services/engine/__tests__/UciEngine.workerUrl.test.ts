import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { EngineVersion } from '../../analysis/constants/EngineVersion'

// Regression test for:
//   https://github.com/raphaelbp12/anti-blunder-club/pull/... (fix/engine-base-url)
//
// The Stockfish worker must be loaded from a path prefixed with Vite's
// `BASE_URL`, so it resolves correctly both in dev (served at `/`) and
// in production (served under `/anti-blunder-club/` on GitHub Pages).
//
// If someone reverts the prefix back to a hardcoded `/engines/`, the
// production case will 404 and analysis will fail with
// `Analysis failed: [object Event]`. These tests pin that contract.

class FakeWorker {
  static lastUrl: string | URL | undefined
  postMessage = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  terminate = vi.fn()
  constructor(url: string | URL) {
    FakeWorker.lastUrl = url
  }
}

function installFakeWorker() {
  FakeWorker.lastUrl = undefined
  vi.stubGlobal('Worker', FakeWorker)
}

describe('UciEngine default worker URL', () => {
  beforeEach(() => {
    vi.resetModules()
    installFakeWorker()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('derives the worker URL from import.meta.env.BASE_URL in dev (/)', async () => {
    vi.stubEnv('BASE_URL', '/')
    const { UciEngine } = await import('../UciEngine')

    new UciEngine({ version: EngineVersion.STOCKFISH_17_LITE })

    expect(FakeWorker.lastUrl).toBe(
      `/engines/${EngineVersion.STOCKFISH_17_LITE}`,
    )
  })

  it('derives the worker URL from import.meta.env.BASE_URL under a sub-path (GitHub Pages)', async () => {
    vi.stubEnv('BASE_URL', '/anti-blunder-club/')
    const { UciEngine } = await import('../UciEngine')

    new UciEngine({ version: EngineVersion.STOCKFISH_17_LITE })

    expect(FakeWorker.lastUrl).toBe(
      `/anti-blunder-club/engines/${EngineVersion.STOCKFISH_17_LITE}`,
    )
  })

  it('honors an explicit enginePathPrefix override', async () => {
    vi.stubEnv('BASE_URL', '/anti-blunder-club/')
    const { UciEngine } = await import('../UciEngine')

    new UciEngine({
      version: EngineVersion.STOCKFISH_17_LITE,
      enginePathPrefix: '/custom/',
    })

    expect(FakeWorker.lastUrl).toBe(
      `/custom/${EngineVersion.STOCKFISH_17_LITE}`,
    )
  })
})
