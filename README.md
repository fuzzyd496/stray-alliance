# The Stray Alliance — LME Dashboard

Static GitHub Pages dashboard tracking weekly Lunar Mine Expedition (LME) results for the
Survivor.io sister clans **aPAWcalypse MEOW** and **StraytOuttaCompton**, two clans of the
broader Stray Collective.

No build step, no framework, no server — plain HTML/CSS/JS. All stats (ranks, Top-30
cutoffs, boss totals, participation, trends) are computed in the browser from `data/data.js`.

## Weekly update workflow

1. Update the Excel workbooks exactly as you do today (new dated sheet + `Results` placement).
2. From this folder, regenerate the data file:

   ```
   python tools/convert.py
   ```

   By default it looks for the two workbooks one directory above this folder;
   pass paths as arguments to override.

3. (Optional) Record **Tickets Used / Tickets Remaining** in the Results sheet of
   each workbook: columns C / D next to Date and Place. Or add a header row naming
   the columns (`Tickets Used`, `Tickets Remaining`) and they can be in any order —
   the converter finds them by name. The site shows tickets used per week and the
   most recent remaining count as the clan's current tickets.
4. (Optional) Record opponent names and daily cleared/held results by editing
   [data/manual.js](data/manual.js). Everything optional; missing values show as "—".
5. Commit and push. GitHub Pages redeploys automatically.

## Data conventions

- Each weekly sheet: `Members | Expedition | 1 | 2 | 3` (P1 score + medals vs. each day's opponent).
- A battle day left blank for the whole roster is treated as **not tracked** (blowout week,
  participation not required) rather than as missed hits.
- A recorded `0` means the player put up no medals that day — shown as data, not judgment.
- Old headers like `1 (26,800)` (boss level faced, before the mechanics change) are preserved
  in the data as `bossLevels` but not featured in the UI.

## Files

- `index.html` — current-week overview, both clans
- `apaw.html` / `soc.html` — clan pages: full weekly leaderboard with Top-30 cutoff, trends, placement history
- `history.html` — all weeks, both clans
- `players.html` — per-player stats, participation, weekly history (player names elsewhere
  on the site link here, e.g. `players.html#apaw:PlayerName`)
- `tools/convert.py` — Excel → `data/data.js` converter (requires Python + openpyxl)
