# WintrChess — Game Analysis & Accuracy: Findings

Source studied: [WintrCat/wintrchess](https://github.com/WintrCat/wintrchess) (cloned into `temp/wintrchess/`).

This document captures how WintrChess performs **per-game analysis**, **per-move classification**, and **per-side accuracy calculation**, and what it takes to reproduce it client-side in this project.

---

## 1. High-Level Pipeline

```
PGN → StateTree (nodes = positions) → Evaluate each position (Stockfish / Lichess cloud)
    → Classify each move (theory / best / blunder / brilliant / …)
    → Compute move accuracy from expected-points loss
    → Average accuracies per side → game accuracy
```

Two distinct stages run in different places:

| Stage | Where it runs in WintrChess | Key file |
| --- | --- | --- |
| **Evaluation** (get engine eval for every position) | **Client**, in a Web Worker | `client/src/apps/features/analysis/lib/evaluate.ts` |
| **Classification + accuracy** (interpret evals) | **Server** (Node) — pure function, could run anywhere | `shared/src/lib/reporter/*` |

The server step is a thin Express route (`POST /api/analysis/analyse`, [analyse.ts](../temp/wintrchess/server/src/routes/api/analysis/analyse.ts)) that just calls the shared `getGameAnalysis()` function. The heavy work — running Stockfish — already happens in the browser. **So the classification/accuracy logic is pure and 100% portable to our client.**

---

## 2. Evaluation Stage (client-side)

[`client/.../analysis/lib/engine.ts`](../temp/wintrchess/client/src/apps/features/analysis/lib/engine.ts), [`evaluate.ts`](../temp/wintrchess/client/src/apps/features/analysis/lib/evaluate.ts), [`cloudEvaluate.ts`](../temp/wintrchess/client/src/apps/features/analysis/lib/cloudEvaluate.ts).

### 2.1 Engine

- Loads Stockfish 17 as a **Web Worker** from `/engines/<version>`. Three builds are shipped in `client/public/engines/`:
  - `stockfish-17-asm.js` (pure JS, asm.js fallback)
  - `stockfish-17-lite-single.js` + `.wasm` (default)
  - `stockfish-17-single.js` + parts `0..5.wasm` (full NNUE)
- Talks standard **UCI** (`uci`, `setoption name X value Y`, `position fen … moves …`, `go depth N [movetime ms]`, `stop`, `quit`).
- Parses `info depth N multipv I score (cp|mate) V pv …` lines. Each parsed info is pushed as an `EngineLine` object:
  ```ts
  { depth, index, evaluation: { type: "centipawn"|"mate", value }, moves: [{uci, san}], source }
  ```
- Flips the score sign when it's Black to move so **all evaluations are stored from White's perspective** (important for later math).

### 2.2 Orchestration

Defaults from `client/src/stores/SettingsStore.ts`:

| Setting | Default |
| --- | --- |
| `engineVersion` | `STOCKFISH_17_LITE` |
| `depth` | **16** |
| `lines` (MultiPV) | **2** |
| `threads` | 4 |
| `maxEngineCount` | 4 parallel engines |

For each position in the game, WintrChess:

1. **Tries the Lichess cloud first**: `GET https://lichess.org/api/cloud-eval?fen=…&multiPv=N`. If the cloud returns depth ≥ engineDepth and enough lines, it is used and Stockfish is skipped for that position. As soon as the cloud misses, it stops trying the cloud for the rest of the game.
2. **Falls back to local Stockfish** for the remaining positions, in parallel across up to `maxEngineCount` worker engines.

MultiPV ≥ 2 is required because brilliant/critical classification depends on the **second-best** line.

---

## 3. Classification Stage (pure, portable)

All logic is in `shared/src/lib/reporter/`. Entry point: [`report.ts`](../temp/wintrchess/shared/src/lib/reporter/report.ts).

```ts
for (const node of treeNodes) {
  node.state.classification = classify(node, options);
  node.state.opening        = getOpeningName(node.state.fen);
  node.state.accuracy       = getMoveAccuracy(previous.evaluation, current.evaluation, moveColour);
}
```

### 3.1 Classification priority ([`classify.ts`](../temp/wintrchess/shared/src/lib/reporter/classify.ts))

1. **FORCED** — previous position had ≤ 1 legal move.
2. **THEORY** — current FEN (pieces field only) is in `resources/openings.json`.
3. **BEST** (short-circuit) — if the move delivered checkmate.
4. **BEST** — played SAN equals the engine's top move SAN.
5. Otherwise **point-loss classification** (`pointLossClassify`).
6. Upgrade to **CRITICAL** if `topMovePlayed && considerCriticalClassification()`.
7. Upgrade to **BRILLIANT** if `classification ≥ BEST && considerBrilliantClassification()`.

Classification enum ordering (for the "≥ BEST" check), from `constants/Classification.ts`:

```
BLUNDER(0) < MISTAKE(1) < INACCURACY/RISKY(2) < OKAY(3) < EXCELLENT(4) < BEST/CRITICAL/BRILLIANT/FORCED/THEORY(5)
```

### 3.2 Point-loss classification ([`classification/pointLoss.ts`](../temp/wintrchess/shared/src/lib/reporter/classification/pointLoss.ts))

Four branches on evaluation types before and after the move:

- **mate → mate**
  - Winning mate flipped to losing mate: `BLUNDER` if subjective ≥ -3, else `MISTAKE`.
  - Otherwise buckets by `mateLoss = (current - previous) * sign(moveColour)`:
    - `< 0` (or `= 0` while losing) → `BEST`
    - `< 2` → `EXCELLENT`
    - `< 7` → `OKAY`
    - else → `INACCURACY`
- **mate → centipawn** (lost the mate). Buckets on subjective cp:
  - `≥ 800 EXCELLENT` · `≥ 400 OKAY` · `≥ 200 INACCURACY` · `≥ 0 MISTAKE` · else `BLUNDER`
- **centipawn → mate** (stepped into mate). Buckets on subjective cp of the new mate (signed as subjective cp):
  - `> 0 BEST` (you're mating) · `≥ -2 BLUNDER` · `≥ -5 MISTAKE` · else `INACCURACY`
- **centipawn → centipawn** — compute `pointLoss` (see §4) and bucket:

  | `pointLoss` | Classification |
  | --- | --- |
  | `< 0.01` | BEST |
  | `< 0.045` | EXCELLENT |
  | `< 0.08` | OKAY |
  | `< 0.12` | INACCURACY |
  | `< 0.22` | MISTAKE |
  | else | BLUNDER |

### 3.3 Critical ([`classification/critical.ts`](../temp/wintrchess/shared/src/lib/reporter/classification/critical.ts))

A top move is **CRITICAL** when:

- `isMoveCriticalCandidate(previous, current)` — not already winning by ≥ +700 cp, not in a losing position, not a queen promotion, previous position was not check.
- Current position is not already a subjective mate-for-you.
- If the move captured, the captured piece must have been **safe** (no free material grabs).
- **Second-best line exists** and its expected-points loss vs the top line is ≥ **0.10** (i.e. the move really was the only good one).

### 3.4 Brilliant ([`classification/brilliant.ts`](../temp/wintrchess/shared/src/lib/reporter/classification/brilliant.ts))

Also requires `isMoveCriticalCandidate`, plus a "sacrifice that works" heuristic:

- Not a promotion.
- The move must **leave** (or keep) unsafe pieces on the board — i.e. it didn't just rescue a hanging piece.
- Every unsafe piece must not have sufficient **counter-threats (danger levels)** when taken.
- Unsafe pieces mustn't all be trapped, and the moved piece itself mustn't have been a trapped piece previously.
- At least one unsafe piece exists.

"Unsafe" piece ([`pieceSafety.ts`](../temp/wintrchess/shared/src/lib/reporter/utils/pieceSafety.ts)): not pawn/king, value > any captured piece, with more attackers than defenders, accounting for lowest-value attacker/defender, pawn defenders, and a "rook for 2 minor pieces" exception.

### 3.5 Opening / Theory

`shared/src/resources/openings.json` is a flat `{ fenPieces → openingName }` map, keyed by the first space-separated field of the FEN. If a match is found for the **current** position, the move is classified THEORY.

---

## 4. Accuracy Calculation ([`accuracy.ts`](../temp/wintrchess/shared/src/lib/reporter/accuracy.ts), [`expectedPoints.ts`](../temp/wintrchess/shared/src/lib/reporter/expectedPoints.ts))

### 4.1 Expected points (win probability from White's POV)

For a centipawn eval `v` (White's perspective):

$$P = \frac{1}{1 + e^{-k v}},\quad k = 0.0035$$

For a mate eval: `P = 1` if mate > 0, `P = 0` if mate < 0, `P = [side-to-move is White]` if mate == 0.

### 4.2 Expected-points loss for a move

Compute `P` before and after the move. The "before" value is taken **from the perspective of the side that was about to move** (hence `flipPieceColour` in the code — the top line belongs to the opponent of the played color until played), and the signed delta is taken from the mover's perspective:

$$\text{loss} = \max\bigl(0,\; (P_\text{prev} - P_\text{curr}) \cdot s\bigr)$$

where `s = +1` for White, `-1` for Black. Clamped at 0.

### 4.3 Move accuracy (%)

$$\text{accuracy} = 103.16 \cdot e^{-4 \cdot \text{loss}} - 3.17$$

Key properties:

- `loss = 0` → **~100%** (103.16 − 3.17 = 99.99)
- `loss ≈ 0.01` → ~95%
- `loss ≈ 0.05` → ~81%
- `loss ≈ 0.10` → ~66%
- `loss ≈ 0.25` → ~35%
- `loss → ∞` → floors near **−3.17** (can go slightly negative; WintrChess does not clamp, it just averages raw values).

### 4.4 Game accuracy per side

Simple arithmetic mean of the per-move accuracies, filtered by `moveColour`:

```ts
return {
  white: mean(accuracy of white moves),
  black: mean(accuracy of black moves),
};
```

No weighting by game phase, no CAPS-style harmonic/weighted mean, no volatility weighting — just the raw mean of `103.16·e^(−4·loss) − 3.17` values.

Note: this is **not** the same formula Chess.com reports. Chess.com's `accuracies` (which we get for free from the Chess.com API) use a different, proprietary formula. WintrChess's numbers will differ and can even go slightly negative on very bad games.

---

## 5. Data Structures to Know

- **`StateTreeNode`** — a tree of game positions. Each node carries `state.fen`, `state.move` (the move that led here), `state.engineLines`, and the outputs we fill in: `state.classification`, `state.accuracy`, `state.opening`. `getNodeChain(root)` returns the main-line nodes in order.
- **`EngineLine`** — `{ depth, index (1 = top), evaluation, moves, source }`. The top line is selected by `index == 1` using `getTopEngineLine`.
- **`Evaluation`** — `{ type: "centipawn" | "mate", value }`, always **from White's perspective**.
- **"Subjective evaluation"** — same number flipped for the side to move, used only for the buckets in `pointLossClassify` and critical/brilliant guards.

---

## 6. Reproducing Client-Side in `anti-blunder-club`

### 6.1 What's trivially portable

The entire `shared/src/lib/reporter/` tree is **pure TypeScript** with only two runtime deps:
- `chess.js` — already a common add; needed for move legality, SAN/UCI, piece lookup, check/mate detection.
- `lodash-es` — only `meanBy`, `minBy`, `clone` etc.; easy to replace or just add.

We can copy (or re-implement) `accuracy.ts`, `expectedPoints.ts`, `classify.ts`, `classification/*`, `utils/*`, plus the `Classification` enum and the `StateTreeNode` / `EngineLine` / `Evaluation` types. **No server required** for this part.

### 6.2 What needs a real engine

To get `engineLines` for every position, we need per-position evals. Options, from cheapest to heaviest:

1. **Lichess cloud only** — `GET https://lichess.org/api/cloud-eval?fen=…&multiPv=2`.
   - Pros: zero-infra, reasonable speed, public.
   - Cons: only popular positions are cached; deep middlegames/endgames of amateur games will mostly miss → analysis incomplete.
2. **Local Stockfish via Web Worker** — same approach WintrChess uses.
   - Ship `stockfish-17-lite-single.{js,wasm}` (or the full NNUE) from `public/engines/`.
   - Set COOP/COEP headers for `SharedArrayBuffer` if using multi-threaded WASM (single-threaded `lite-single` avoids this but is slower).
   - Drive it with a small UCI wrapper (copy WintrChess's `engine.ts` almost verbatim).
3. **Hybrid** (WintrChess's choice) — cloud first, local fallback. Recommended if we go this route.

### 6.3 Recommended incremental path

1. **Port the pure analyzer.** Copy `accuracy.ts` + `expectedPoints.ts` and the `Evaluation` type under `frontend/src/utils/`. Add unit tests that feed hand-crafted `EngineLine` pairs through `getMoveAccuracy` / `getGameAccuracy`.
2. **Port types & classification.** Bring over `StateTreeNode`, `EngineLine`, `Classification`, the `classify()` tree, and its utils. Unit-test against a few hand-rolled games.
3. **Wire up a position provider.** Start with **Lichess cloud only** to get end-to-end working with no engine shipping. Surface "partial analysis" clearly when cloud misses.
4. **Add local Stockfish** (lite build first) as a progressive enhancement. Port `engine.ts` directly; it's self-contained.
5. **Optional:** skip brilliant/critical initially (requires MultiPV 2 and piece-safety utils) and ship only BEST/EXCELLENT/…/BLUNDER buckets. Enable the extras behind a setting once piece-safety utils are ported.

### 6.4 Gotchas

- Engine score sign must be flipped when it's Black to move, **before** storing. Everything downstream assumes White-perspective evals.
- `getExpectedPoints` uses `flipPieceColour(moveColour)` on the **previous** evaluation — the top line in the previous position describes what the side-to-move could have done, which is the opposite colour of the one that actually moved.
- `classify` needs the **top move SAN from the previous position's engine lines** and the **played move SAN from the current node**. Make sure these are both populated before calling.
- "Theory" depends on a large openings JSON keyed by FEN pieces; ship WintrChess's `openings.json` (or Lichess's opening book dump) as a static asset.
- Brilliant/critical require MultiPV ≥ 2 in **every** position, otherwise `previous.secondTopLine` will be missing and both checks return false.
- WintrChess uses default **depth 16** with MultiPV 2. That's a reasonable target to match its numbers.

---

## 7. File Map (for quick reference)

| Concern | Path |
| --- | --- |
| Engine worker wrapper | `client/src/apps/features/analysis/lib/engine.ts` |
| Per-game evaluation orchestrator | `client/src/apps/features/analysis/lib/evaluate.ts` |
| Lichess cloud eval | `client/src/apps/features/analysis/lib/cloudEvaluate.ts` |
| Report entry point | `shared/src/lib/reporter/report.ts` |
| Accuracy formula | `shared/src/lib/reporter/accuracy.ts` |
| Expected-points & loss | `shared/src/lib/reporter/expectedPoints.ts` |
| Classification entry | `shared/src/lib/reporter/classify.ts` |
| Buckets (cp/mate) | `shared/src/lib/reporter/classification/pointLoss.ts` |
| Critical detection | `shared/src/lib/reporter/classification/critical.ts` |
| Brilliant detection | `shared/src/lib/reporter/classification/brilliant.ts` |
| Piece safety / attackers / defenders / danger levels / trapped | `shared/src/lib/reporter/utils/` |
| Classification enum | `shared/src/constants/Classification.ts` |
| Engine versions | `shared/src/constants/EngineVersion.ts` |
| Default engine settings | `client/src/stores/SettingsStore.ts` |
| Openings book | `shared/src/resources/openings.json` |

---

## 8. TL;DR

- **Evaluation** = Stockfish 17 WASM in a Web Worker (+ Lichess cloud eval API as a fast path), MultiPV 2, depth 16.
- **Accuracy** = `103.16 · exp(−4 · L) − 3.17`, where `L` is the expected-points loss from a sigmoid win-probability (`k = 0.0035`). Game accuracy is the plain mean of move accuracies per side.
- **Classification** is a priority ladder — FORCED → THEORY → BEST (played top move / checkmate) → cp/mate buckets → upgrade to CRITICAL / BRILLIANT via piece-safety heuristics.
- **All the interesting logic is pure and has no server dependency.** We can reproduce it 100% client-side; the only real question is where engine evals come from (cloud-only, local WASM, or hybrid).
