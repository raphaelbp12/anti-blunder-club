# Stockfish engine binaries

This folder ships **Stockfish 17 Lite** (single-threaded) as a Web Worker
build, so the analysis engine can run entirely in the user's browser.

## Files

| File                            | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `stockfish-17-lite-single.js`   | Web Worker entry point (UCI driver).              |
| `stockfish-17-lite-single.wasm` | WebAssembly binary (the engine itself).           |

These are served verbatim from `public/`; the runtime loader at
[frontend/src/services/engine/UciEngine.ts](../../src/services/engine/UciEngine.ts)
spawns a `Worker("/engines/stockfish-17-lite-single.js")`.

## License and attribution

**Stockfish is distributed under the GNU General Public License v3.0 (or
later).** This project is also licensed under GPL-3.0-or-later (see the
root [LICENSE](../../../LICENSE) file), which makes redistribution of the
Stockfish binaries here compatible.

- Upstream project: https://stockfishchess.org/
- Source code: https://github.com/official-stockfish/Stockfish
- License: https://github.com/official-stockfish/Stockfish/blob/master/Copying.txt

These binaries were sourced via
[WintrChess](https://github.com/WintrCat/wintrchess) (also GPL-3.0),
which publishes a tested WebAssembly build of Stockfish 17 Lite.

If you distribute a modified build of this project, you must continue to
provide the corresponding source of Stockfish, either by bundling it or by
pointing to a publicly available copy (e.g. the official-stockfish
repository above).

## Flagged for later

The `.wasm` is ~7 MB and inflates the repository. Once analysis is stable,
we may switch to fetching the binary from a CDN (Lichess or jsDelivr) at
runtime to keep the repo lean.
