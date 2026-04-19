// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// MVP stub: returns undefined so we don't ship the ~1MB openings.json yet.
// MVP callers must use AnalysisOptions { includeTheory: false }.

export function getOpeningName(fen: string): string | undefined {
  void fen
  return undefined
}
